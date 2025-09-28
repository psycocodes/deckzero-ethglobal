// ENS service for minting badge subdomains on Ethereum
import { ethers } from 'ethers';
import { EthereumProvider } from '@walletconnect/ethereum-provider';
import { config } from '@/config';

export interface ENSSubdomain {
  subdomain: string;
  fullDomain: string;
  owner: string;
  transactionHash?: string;
  blockNumber?: number;
  timestamp?: number;
}

export interface ENSMintRequest {
  playerAddress: string;
  gameSessionId: string;
  achievement: string;
  subdomainPrefix?: string;
}

class ENSService {
  private static instance: ENSService;
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private walletConnectProvider: any = null;
  private ensRegistry: ethers.Contract | null = null;
  private ensResolver: ethers.Contract | null = null;
  private mintedSubdomains: Set<string> = new Set();

  // ENS Registry ABI (minimal required functions)
  private readonly ENS_REGISTRY_ABI = [
    'function setSubnodeOwner(bytes32 node, bytes32 label, address owner) external',
    'function owner(bytes32 node) external view returns (address)',
    'function resolver(bytes32 node) external view returns (address)',
    'function setResolver(bytes32 node, address resolver) external',
    'event NewOwner(bytes32 indexed node, bytes32 indexed label, address owner)',
  ];

  // ENS Resolver ABI (minimal required functions)
  private readonly ENS_RESOLVER_ABI = [
    'function setAddr(bytes32 node, address addr) external',
    'function addr(bytes32 node) external view returns (address)',
    'function setText(bytes32 node, string calldata key, string calldata value) external',
    'function text(bytes32 node, string calldata key) external view returns (string memory)',
  ];

  private constructor() {}

  public static getInstance(): ENSService {
    if (!ENSService.instance) {
      ENSService.instance = new ENSService();
    }
    return ENSService.instance;
  }

  // Initialize ENS service with WalletConnect
  public async initialize(): Promise<void> {
    try {
      // Initialize WalletConnect provider
      // Initialize WalletConnect with simplified config
      this.walletConnectProvider = await EthereumProvider.init({
        projectId: config.walletConnect.projectId,
        chains: [1], // Ethereum mainnet
        optionalChains: [11155111], // Sepolia testnet
        showQrModal: true,
        metadata: config.walletConnect.appMetadata,
      });

      console.log('✅ ENS Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize ENS service:', error);
      throw error;
    }
  }

  // Connect to Ethereum wallet
  public async connectWallet(): Promise<string> {
    try {
      if (!this.walletConnectProvider) {
        throw new Error('WalletConnect provider not initialized');
      }

      // Enable the provider (shows QR code modal)
      const accounts = await this.walletConnectProvider.enable();
      
      // Create ethers provider and signer
      this.provider = new ethers.BrowserProvider(this.walletConnectProvider);
      if (this.provider) {
        this.signer = await this.provider.getSigner();
      }

      // Initialize ENS contracts
      this.ensRegistry = new ethers.Contract(
        config.ethereum.contracts.ensRegistry,
        this.ENS_REGISTRY_ABI,
        this.signer
      );

      this.ensResolver = new ethers.Contract(
        config.ethereum.contracts.ensResolver,
        this.ENS_RESOLVER_ABI,
        this.signer
      );

      const address = accounts[0];
      console.log('✅ Ethereum wallet connected:', address);

      return address;
    } catch (error) {
      console.error('❌ Failed to connect Ethereum wallet:', error);
      throw error;
    }
  }

  // Disconnect wallet
  public async disconnect(): Promise<void> {
    try {
      if (this.walletConnectProvider) {
        await this.walletConnectProvider.disconnect();
      }
      
      this.provider = null;
      this.signer = null;
      this.ensRegistry = null;
      this.ensResolver = null;
      
      console.log('🔌 Ethereum wallet disconnected');
    } catch (error) {
      console.error('❌ Failed to disconnect wallet:', error);
    }
  }

  // Generate unique subdomain name
  private generateSubdomain(
    playerAddress: string,
    gameSessionId: string,
    achievement?: string
  ): string {
    const addressSuffix = playerAddress.slice(-6);
    const sessionSuffix = gameSessionId.slice(-4);
    const achievementPrefix = achievement ? achievement.toLowerCase().replace(/[^a-z0-9]/g, '') : 'winner';
    
    // Ensure subdomain is unique and valid
    const timestamp = Date.now().toString().slice(-4);
    return `${achievementPrefix}${addressSuffix}${sessionSuffix}${timestamp}`;
  }

  // Calculate ENS namehash
  private namehash(name: string): string {
    if (!name) {
      return '0x0000000000000000000000000000000000000000000000000000000000000000';
    }

    let node = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const parts = name.split('.').reverse();

    for (const part of parts) {
      const labelHash = ethers.keccak256(ethers.toUtf8Bytes(part));
      node = ethers.keccak256(ethers.concat([node, labelHash]));
    }

    return node;
  }

  // Mint ENS subdomain for game winner
  public async mintSubdomain(mintRequest: ENSMintRequest): Promise<ENSSubdomain> {
    try {
      if (!this.ensRegistry || !this.signer) {
        throw new Error('ENS service not properly initialized');
      }

      // Generate subdomain
      const subdomain = mintRequest.subdomainPrefix || 
        this.generateSubdomain(
          mintRequest.playerAddress,
          mintRequest.gameSessionId,
          mintRequest.achievement
        );
      
      const fullDomain = `${subdomain}.${config.ethereum.baseDomain}`;

      // Check if already minted
      if (this.mintedSubdomains.has(fullDomain)) {
        throw new Error(`Subdomain ${fullDomain} already minted`);
      }

      console.log(`🏷️ Minting ENS subdomain: ${fullDomain} for ${mintRequest.playerAddress}`);

      // Calculate namehashes
      const baseNamehash = this.namehash(config.ethereum.baseDomain);
      const labelHash = ethers.keccak256(ethers.toUtf8Bytes(subdomain));

      // Estimate gas
      const gasEstimate = await this.ensRegistry.setSubnodeOwner.estimateGas(
        baseNamehash,
        labelHash,
        mintRequest.playerAddress
      );

      // Send transaction
      const tx = await this.ensRegistry.setSubnodeOwner(
        baseNamehash,
        labelHash,
        mintRequest.playerAddress,
        { gasLimit: gasEstimate }
      );

      console.log(`📤 ENS transaction sent: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();

      if (receipt?.status === 1) {
        // Mark as minted
        this.mintedSubdomains.add(fullDomain);

        const ensSubdomain: ENSSubdomain = {
          subdomain,
          fullDomain,
          owner: mintRequest.playerAddress,
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          timestamp: Date.now(),
        };

        console.log(`✅ ENS subdomain minted successfully: ${fullDomain}`);

        // Set resolver and address record (optional)
        await this.setSubdomainRecords(ensSubdomain);

        return ensSubdomain;
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('❌ Failed to mint ENS subdomain:', error);
      throw error;
    }
  }

  // Set resolver and address records for subdomain
  private async setSubdomainRecords(ensSubdomain: ENSSubdomain): Promise<void> {
    try {
      if (!this.ensRegistry || !this.ensResolver) return;

      const subdomainNamehash = this.namehash(ensSubdomain.fullDomain);

      // Set resolver
      const setResolverTx = await this.ensRegistry.setResolver(
        subdomainNamehash,
        config.ethereum.contracts.ensResolver
      );
      await setResolverTx.wait();

      // Set address record
      const setAddrTx = await this.ensResolver.setAddr(
        subdomainNamehash,
        ensSubdomain.owner
      );
      await setAddrTx.wait();

      // Set text records with game metadata
      const setTextTx = await this.ensResolver.setText(
        subdomainNamehash,
        'description',
        'DeckZero Game Winner Badge'
      );
      await setTextTx.wait();

      console.log(`📝 ENS records set for ${ensSubdomain.fullDomain}`);
    } catch (error) {
      console.warn('⚠️ Failed to set ENS records (subdomain still minted):', error);
    }
  }

  // Get subdomain information
  public async getSubdomainInfo(fullDomain: string): Promise<any> {
    try {
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }

      const namehash = this.namehash(fullDomain);
      
      // Get owner
      const registryContract = new ethers.Contract(
        config.ethereum.contracts.ensRegistry,
        this.ENS_REGISTRY_ABI,
        this.provider
      );
      
      const owner = await registryContract.owner(namehash);
      
      if (owner === '0x0000000000000000000000000000000000000000') {
        return null; // Domain not registered
      }

      // Get resolver
      const resolverAddress = await registryContract.resolver(namehash);
      
      let resolvedAddress = null;
      if (resolverAddress !== '0x0000000000000000000000000000000000000000') {
        const resolverContract = new ethers.Contract(
          resolverAddress,
          this.ENS_RESOLVER_ABI,
          this.provider
        );
        
        try {
          resolvedAddress = await resolverContract.addr(namehash);
        } catch (error) {
          console.warn('Could not resolve address for domain');
        }
      }

      return {
        domain: fullDomain,
        owner,
        resolverAddress,
        resolvedAddress,
      };
    } catch (error) {
      console.error('❌ Failed to get subdomain info:', error);
      throw error;
    }
  }

  // Batch mint multiple subdomains
  public async batchMintSubdomains(requests: ENSMintRequest[]): Promise<ENSSubdomain[]> {
    const results: ENSSubdomain[] = [];
    const errors: Error[] = [];

    for (const request of requests) {
      try {
        const result = await this.mintSubdomain(request);
        results.push(result);
        
        // Add small delay between mints to avoid nonce conflicts
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to mint subdomain for ${request.playerAddress}:`, error);
        errors.push(error as Error);
      }
    }

    if (errors.length > 0 && results.length === 0) {
      throw new Error(`All batch mints failed: ${errors.map(e => e.message).join(', ')}`);
    }

    return results;
  }

  // Get all minted subdomains
  public getMintedSubdomains(): string[] {
    return Array.from(this.mintedSubdomains);
  }

  // Check if subdomain is already minted
  public isSubdomainMinted(fullDomain: string): boolean {
    return this.mintedSubdomains.has(fullDomain);
  }

  // Get wallet connection status
  public isWalletConnected(): boolean {
    return this.signer !== null;
  }

  // Get connected wallet address
  public async getConnectedAddress(): Promise<string | null> {
    try {
      if (!this.signer) return null;
      return await this.signer.getAddress();
    } catch (error) {
      return null;
    }
  }

  // Health check
  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.provider) return false;
      
      await this.provider.getNetwork();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const ensService = ENSService.getInstance();
export default ensService;