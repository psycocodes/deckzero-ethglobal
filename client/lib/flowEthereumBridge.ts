// Flow-Ethereum Integration Service
// This service listens for Flow events and handles ENS subdomain minting

import { ethers } from 'ethers';
import { createPublicClient, createWalletClient, http, custom } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import * as fcl from '@onflow/fcl';
import { WalletConnectModal } from '@walletconnect/modal';
import { EthereumProvider } from '@walletconnect/ethereum-provider';

interface FlowEvent {
  gameId: string;
  winner: string;
  prize: string;
  timestamp: string;
}

interface AddressMapping {
  [flowAddress: string]: string; // Flow address -> Ethereum address
}

interface ENSContracts {
  registry: string;
  resolver: string;
  reverseRegistrar: string;
}

class FlowEthereumBridge {
  private flowRPC: string;
  private ethereumProvider: EthereumProvider | null = null;
  private ethPublicClient: any;
  private ethWalletClient: any;
  private walletConnectModal: WalletConnectModal;
  private addressMapping: AddressMapping = {};
  private mintedSubdomains: Set<string> = new Set();
  private isListening: boolean = false;
  
  // Configuration
  private readonly FLOW_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_FLOW_CONTRACT_ADDRESS || '';
  private readonly WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';
  private readonly BASE_DOMAIN = 'winner.eth';
  private readonly POLLING_INTERVAL = 5000; // 5 seconds
  
  // ENS Contract addresses (Ethereum Mainnet)
  private readonly ENS_CONTRACTS: ENSContracts = {
    registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    resolver: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
    reverseRegistrar: '0x084b1c3C81545d370f3634392De611CaaBFf8148'
  };
  
  // ENS Registry ABI (minimal)
  private readonly ENS_REGISTRY_ABI = [
    {
      'type': 'function',
      'name': 'setSubnodeOwner',
      'inputs': [
        {'name': 'node', 'type': 'bytes32'},
        {'name': 'label', 'type': 'bytes32'},
        {'name': 'owner', 'type': 'address'}
      ],
      'outputs': [],
      'stateMutability': 'nonpayable'
    },
    {
      'type': 'function',
      'name': 'owner',
      'inputs': [{'name': 'node', 'type': 'bytes32'}],
      'outputs': [{'name': '', 'type': 'address'}],
      'stateMutability': 'view'
    }
  ] as const;
  
  private lastCheckedBlock: number = 0;
  
  constructor(flowRPC: string = 'https://rest-testnet.onflow.org') {
    this.flowRPC = flowRPC;
    this.initializeFlow();
    this.initializeWalletConnect();
    this.loadAddressMapping();
  }
  
  /**
   * Initialize Flow blockchain connection
   */
  private async initializeFlow(): Promise<void> {
    try {
      // Configure Flow Client Library
      fcl.config({
        'accessNode.api': this.flowRPC,
        'discovery.wallet': 'https://fcl-discovery.onflow.org/testnet/authn',
        'app.detail.title': 'DeckZero',
        'app.detail.icon': 'https://deckzero.app/icon.png'
      });
      
      console.log('✅ Flow blockchain connection initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Flow:', error);
      throw error;
    }
  }
  
  /**
   * Initialize WalletConnect for Ethereum
   */
  private async initializeWalletConnect(): Promise<void> {
    try {
      this.walletConnectModal = new WalletConnectModal({
        projectId: this.WALLETCONNECT_PROJECT_ID,
        chains: [mainnet, sepolia]
      });
      
      console.log('✅ WalletConnect initialized');
    } catch (error) {
      console.error('❌ Failed to initialize WalletConnect:', error);
      throw error;
    }
  }
  
  /**
   * Connect to Ethereum wallet via WalletConnect
   */
  public async connectEthereumWallet(): Promise<string> {
    try {
      console.log('🔗 Connecting to Ethereum wallet...');
      
      this.ethereumProvider = await EthereumProvider.init({
        projectId: this.WALLETCONNECT_PROJECT_ID,
        chains: [1, 11155111], // Mainnet and Sepolia
        showQrModal: true,
        metadata: {
          name: 'DeckZero',
          description: 'Blockchain Gaming Platform',
          url: 'https://deckzero.app',
          icons: ['https://deckzero.app/icon.png']
        }
      });
      
      await this.ethereumProvider.enable();
      
      // Create viem clients
      this.ethPublicClient = createPublicClient({
        chain: mainnet,
        transport: http()
      });
      
      this.ethWalletClient = createWalletClient({
        chain: mainnet,
        transport: custom(this.ethereumProvider)
      });
      
      const addresses = await this.ethWalletClient.getAddresses();
      const address = addresses[0];
      
      console.log('✅ Ethereum wallet connected:', address);
      return address;
      
    } catch (error) {
      console.error('❌ Failed to connect Ethereum wallet:', error);
      throw error;
    }
  }
  
  /**
   * Load address mapping from local storage or API
   */
  private loadAddressMapping(): void {
    try {
      const stored = localStorage.getItem('flow-ethereum-mapping');
      if (stored) {
        this.addressMapping = JSON.parse(stored);
        console.log(`📋 Loaded ${Object.keys(this.addressMapping).length} address mappings`);
      } else {
        // Load default mappings for testing
        this.addressMapping = {
          '0x1234567890123456': '0x742d35Cc6235b8D24b9b3B2A89E8FFD5AADA4b7e', // Example mapping
          // Add more test mappings
        };
        this.saveAddressMapping();
      }
    } catch (error) {
      console.error('❌ Failed to load address mapping:', error);
      this.addressMapping = {};
    }
  }
  
  /**
   * Save address mapping to local storage
   */
  private saveAddressMapping(): void {
    try {
      localStorage.setItem('flow-ethereum-mapping', JSON.stringify(this.addressMapping));
      console.log('💾 Address mapping saved');
    } catch (error) {
      console.error('❌ Failed to save address mapping:', error);
    }
  }
  
  /**
   * Add new address mapping
   */
  public addAddressMapping(flowAddress: string, ethereumAddress: string): void {
    this.addressMapping[flowAddress.toLowerCase()] = ethereumAddress.toLowerCase();
    this.saveAddressMapping();
    console.log(`➕ Added mapping: ${flowAddress} -> ${ethereumAddress}`);
  }
  
  /**
   * Start listening for Flow PlayerWon events
   */
  public async startListening(): Promise<void> {
    if (this.isListening) {
      console.log('⚠️ Already listening for events');
      return;
    }
    
    this.isListening = true;
    console.log('👂 Started listening for Flow PlayerWon events...');
    
    // Get current block height
    try {
      const latestBlock = await this.getLatestFlowBlock();
      this.lastCheckedBlock = latestBlock.height;
    } catch (error) {
      console.warn('⚠️ Could not get latest block, starting from 0');
      this.lastCheckedBlock = 0;
    }
    
    // Start polling for events
    this.pollForEvents();
  }
  
  /**
   * Stop listening for events
   */
  public stopListening(): void {
    this.isListening = false;
    console.log('🛑 Stopped listening for Flow events');
  }
  
  /**
   * Poll for new Flow events
   */
  private async pollForEvents(): Promise<void> {
    while (this.isListening) {
      try {
        await this.checkForNewEvents();
      } catch (error) {
        console.error('❌ Error polling for events:', error);
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, this.POLLING_INTERVAL));
    }
  }
  
  /**
   * Check for new PlayerWon events since last check
   */
  private async checkForNewEvents(): Promise<void> {
    try {
      // Query Flow events using FCL
      const events = await fcl.send([
        fcl.script`
          import DeckZeroGame from ${this.FLOW_CONTRACT_ADDRESS}
          
          pub fun main(fromBlock: UInt64, toBlock: UInt64): [DeckZeroGame.PlayerWonEvent] {
            // This is a simplified example - you'd need to implement proper event querying
            // Flow doesn't have direct event querying like Ethereum, so you might need to:
            // 1. Use Flow's event API
            // 2. Monitor transactions that interact with your contract
            // 3. Use Flow's GraphQL API
            return []
          }
        `,
        fcl.args([
          fcl.arg(this.lastCheckedBlock, fcl.t.UInt64),
          fcl.arg(999999999, fcl.t.UInt64) // Current block
        ])
      ]).then(fcl.decode);
      
      // Process each event
      for (const event of events) {
        await this.processPlayerWonEvent(event);
      }
      
      // Update last checked block
      const latestBlock = await this.getLatestFlowBlock();
      this.lastCheckedBlock = latestBlock.height;
      
    } catch (error) {
      console.error('❌ Failed to check for new events:', error);
    }
  }
  
  /**
   * Get latest Flow block
   */
  private async getLatestFlowBlock(): Promise<any> {
    return await fcl.send([fcl.getBlock(true)]).then(fcl.decode);
  }
  
  /**
   * Process a PlayerWon event
   */
  private async processPlayerWonEvent(event: FlowEvent): Promise<void> {
    try {
      console.log('🎉 PlayerWon event detected:', event);
      
      const flowWinner = event.winner.toLowerCase();
      const ethereumAddress = this.addressMapping[flowWinner];
      
      if (!ethereumAddress) {
        console.error(`❌ No Ethereum address mapping found for Flow address: ${flowWinner}`);
        return;
      }
      
      // Generate subdomain
      const subdomain = this.generateSubdomain(flowWinner);
      const fullDomain = `${subdomain}.${this.BASE_DOMAIN}`;
      
      // Check if already minted
      if (this.mintedSubdomains.has(fullDomain)) {
        console.log(`⚠️ Subdomain ${fullDomain} already minted`);
        return;
      }
      
      // Mint ENS subdomain
      await this.mintENSSubdomain(ethereumAddress, subdomain);
      
    } catch (error) {
      console.error('❌ Failed to process PlayerWon event:', error);
    }
  }
  
  /**
   * Generate subdomain name from Flow address
   */
  private generateSubdomain(flowAddress: string): string {
    // Generate a unique subdomain based on the Flow address
    const hash = this.simpleHash(flowAddress);
    return `winner${hash.substring(0, 8)}`;
  }
  
  /**
   * Simple hash function for generating subdomain names
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
  
  /**
   * Mint ENS subdomain for the winner
   */
  private async mintENSSubdomain(ethereumAddress: string, subdomain: string): Promise<void> {
    try {
      if (!this.ethWalletClient) {
        throw new Error('Ethereum wallet not connected');
      }
      
      console.log(`🏷️ Minting ENS subdomain: ${subdomain}.${this.BASE_DOMAIN} for ${ethereumAddress}`);
      
      // Calculate namehash for base domain
      const baseNamehash = this.namehash(this.BASE_DOMAIN);
      
      // Calculate label hash for subdomain
      const labelHash = ethers.keccak256(ethers.toUtf8Bytes(subdomain));
      
      // Prepare transaction data
      const data = ethers.Interface.from(this.ENS_REGISTRY_ABI).encodeFunctionData('setSubnodeOwner', [
        baseNamehash,
        labelHash,
        ethereumAddress
      ]);
      
      // Send transaction
      const txHash = await this.ethWalletClient.sendTransaction({
        to: this.ENS_CONTRACTS.registry as `0x${string}`,
        data: data as `0x${string}`,
        value: BigInt(0)
      });
      
      console.log(`📤 ENS transaction sent: ${txHash}`);
      
      // Wait for confirmation
      const receipt = await this.ethPublicClient.waitForTransactionReceipt({ hash: txHash });
      
      if (receipt.status === 'success') {
        const fullDomain = `${subdomain}.${this.BASE_DOMAIN}`;
        this.mintedSubdomains.add(fullDomain);
        console.log(`✅ ENS subdomain minted successfully: ${fullDomain}`);
        
        // Emit custom event
        this.onSubdomainMinted(fullDomain, txHash, ethereumAddress);
      } else {
        throw new Error('Transaction failed');
      }
      
    } catch (error) {
      console.error('❌ Failed to mint ENS subdomain:', error);
      throw error;
    }
  }
  
  /**
   * Calculate ENS namehash
   */
  private namehash(name: string): string {
    let node = '0x0000000000000000000000000000000000000000000000000000000000000000';
    
    if (name) {
      const labels = name.split('.');
      for (let i = labels.length - 1; i >= 0; i--) {
        const labelHash = ethers.keccak256(ethers.toUtf8Bytes(labels[i]));
        node = ethers.keccak256(ethers.concat([node, labelHash]));
      }
    }
    
    return node;
  }
  
  /**
   * Event handler for successful subdomain minting
   */
  private onSubdomainMinted(subdomain: string, txHash: string, owner: string): void {
    const event = new CustomEvent('subdomainMinted', {
      detail: {
        subdomain,
        transactionHash: txHash,
        owner,
        timestamp: Date.now()
      }
    });
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }
    
    console.log(`🎊 Subdomain minted event dispatched: ${subdomain}`);
  }
  
  /**
   * Get current address mapping
   */
  public getAddressMapping(): AddressMapping {
    return { ...this.addressMapping };
  }
  
  /**
   * Get minted subdomains
   */
  public getMintedSubdomains(): string[] {
    return Array.from(this.mintedSubdomains);
  }
  
  /**
   * Check if subdomain is already minted
   */
  public isSubdomainMinted(subdomain: string): boolean {
    return this.mintedSubdomains.has(`${subdomain}.${this.BASE_DOMAIN}`);
  }
  
  /**
   * Manually trigger event processing (for testing)
   */
  public async testProcessPlayerWin(flowAddress: string): Promise<void> {
    const mockEvent: FlowEvent = {
      gameId: '1',
      winner: flowAddress,
      prize: '100.0',
      timestamp: Date.now().toString()
    };
    
    await this.processPlayerWonEvent(mockEvent);
  }
}

export default FlowEthereumBridge;
export type { FlowEvent, AddressMapping };