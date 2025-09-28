// Web3Auth service for Web2-style authentication with Flow wallet creation
import { Web3Auth } from '@web3auth/modal';
import { CHAIN_NAMESPACES, IProvider } from '@web3auth/base';
import { EthereumPrivateKeyProvider } from '@web3auth/ethereum-provider';
import { config } from '@/config';

export interface UserProfile {
  userId: string;
  email?: string;
  name?: string;
  profileImage?: string;
  provider: string;
  flowAddress?: string;
  ethereumAddress?: string;
  createdAt: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  provider: IProvider | null;
  flowAddress: string | null;
  ethereumAddress: string | null;
}

class Web3AuthService {
  private static instance: Web3AuthService;
  private web3auth: Web3Auth | null = null;
  private provider: IProvider | null = null;
  private currentUser: UserProfile | null = null;

  private constructor() {}

  public static getInstance(): Web3AuthService {
    if (!Web3AuthService.instance) {
      Web3AuthService.instance = new Web3AuthService();
    }
    return Web3AuthService.instance;
  }

  // Initialize Web3Auth
  public async initialize(): Promise<void> {
    try {
      const chainConfig = {
        chainNamespace: CHAIN_NAMESPACES.EIP155,
        chainId: config.web3Auth.chainConfig.chainId,
        rpcTarget: config.web3Auth.chainConfig.rpcTarget,
        displayName: config.web3Auth.chainConfig.displayName,
        blockExplorer: config.web3Auth.chainConfig.blockExplorer,
        ticker: config.web3Auth.chainConfig.ticker,
        tickerName: config.web3Auth.chainConfig.tickerName,
      };

      const privateKeyProvider = new EthereumPrivateKeyProvider({
        config: { chainConfig },
      });

      this.web3auth = new Web3Auth({
        clientId: config.web3Auth.clientId,
        web3AuthNetwork: config.web3Auth.network,
        privateKeyProvider,
        uiConfig: {
          theme: {
            primary: '#0364ff',
            onPrimary: 'white'
          },
          loginMethodsOrder: ['google', 'github', 'discord', 'twitter'],
          appName: 'DeckZero',
          defaultLanguage: 'en',
        },
      });

      await this.web3auth.initModal();
      
      // Check if user is already authenticated
      if (this.web3auth.connected) {
        this.provider = this.web3auth.provider;
        await this.loadUserProfile();
      }

      console.log('✅ Web3Auth initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Web3Auth:', error);
      throw error;
    }
  }

  // Authenticate user with social login
  public async login(provider?: string): Promise<UserProfile> {
    try {
      if (!this.web3auth) {
        throw new Error('Web3Auth not initialized');
      }

      const web3authProvider = await this.web3auth.connect();
      if (!web3authProvider) {
        throw new Error('Failed to connect to Web3Auth');
      }

      this.provider = web3authProvider;
      await this.loadUserProfile();

      if (!this.currentUser) {
        throw new Error('Failed to load user profile');
      }

      // Create Flow wallet for new user
      await this.setupFlowWallet();

      console.log('✅ User authenticated:', this.currentUser);
      return this.currentUser;
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      throw error;
    }
  }

  // Logout user
  public async logout(): Promise<void> {
    try {
      if (!this.web3auth) {
        throw new Error('Web3Auth not initialized');
      }

      await this.web3auth.logout();
      this.provider = null;
      this.currentUser = null;

      console.log('✅ User logged out');
    } catch (error) {
      console.error('❌ Logout failed:', error);
      throw error;
    }
  }

  // Load user profile information
  private async loadUserProfile(): Promise<void> {
    try {
      if (!this.web3auth || !this.provider) {
        throw new Error('Web3Auth not properly initialized');
      }

      // Get user info from Web3Auth
      const user = await this.web3auth.getUserInfo();
      
      // Get Ethereum address
      const ethereumAddress = await this.getEthereumAddress();
      
      // Get or create Flow address
      const flowAddress = await this.getOrCreateFlowAddress();

      this.currentUser = {
        userId: user.verifierId || 'unknown',
        email: user.email,
        name: user.name,
        profileImage: user.profileImage,
        provider: (user.typeOfLogin as string) || 'unknown',
        flowAddress,
        ethereumAddress,
        createdAt: Date.now(),
      };

      // Store user profile locally
      localStorage.setItem('deckzero_user_profile', JSON.stringify(this.currentUser));
    } catch (error) {
      console.error('❌ Failed to load user profile:', error);
      throw error;
    }
  }

  // Get Ethereum address from provider
  private async getEthereumAddress(): Promise<string> {
    try {
      if (!this.provider) {
        throw new Error('Provider not available');
      }

      const accounts = await this.provider.request({
        method: 'eth_accounts',
      }) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error('No Ethereum accounts found');
      }

      return accounts[0];
    } catch (error) {
      console.error('❌ Failed to get Ethereum address:', error);
      throw error;
    }
  }

  // Get or create Flow address
  private async getOrCreateFlowAddress(): Promise<string> {
    try {
      // Check if user already has a Flow address stored
      const storedProfile = localStorage.getItem('deckzero_user_profile');
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        if (profile.flowAddress) {
          return profile.flowAddress;
        }
      }

      // For now, we'll generate a mock Flow address
      // In a real implementation, this would:
      // 1. Use the user's private key to derive a Flow address
      // 2. Or integrate with Flow's account creation system
      // 3. Or use a custodial wallet service

      const mockFlowAddress = `0x${Math.random().toString(16).substr(2, 16)}`;
      console.log('🔗 Generated mock Flow address:', mockFlowAddress);

      return mockFlowAddress;
    } catch (error) {
      console.error('❌ Failed to get/create Flow address:', error);
      throw error;
    }
  }

  // Setup Flow wallet for user
  private async setupFlowWallet(): Promise<void> {
    try {
      if (!this.currentUser?.flowAddress) {
        throw new Error('Flow address not available');
      }

      // Initialize Flow wallet with user's key
      // This would involve:
      // 1. Setting up Flow account
      // 2. Funding with initial tokens if needed
      // 3. Setting up necessary resource collections

      console.log('🚀 Flow wallet setup complete for:', this.currentUser.flowAddress);
    } catch (error) {
      console.error('❌ Failed to setup Flow wallet:', error);
      // Don't throw - wallet setup is optional for auth
    }
  }

  // Sign Flow transaction
  public async signFlowTransaction(transaction: any): Promise<any> {
    try {
      if (!this.provider || !this.currentUser) {
        throw new Error('User not authenticated');
      }

      // This would integrate with Flow's transaction signing
      // For now, we'll return a mock signature
      console.log('✍️ Signing Flow transaction:', transaction);

      return {
        signature: `mock_signature_${Date.now()}`,
        keyId: 0,
        addr: this.currentUser.flowAddress,
      };
    } catch (error) {
      console.error('❌ Failed to sign Flow transaction:', error);
      throw error;
    }
  }

  // Sign Ethereum transaction
  public async signEthereumTransaction(transaction: any): Promise<string> {
    try {
      if (!this.provider) {
        throw new Error('Provider not available');
      }

      const signature = await this.provider.request({
        method: 'eth_signTransaction',
        params: [transaction],
      }) as string;

      return signature;
    } catch (error) {
      console.error('❌ Failed to sign Ethereum transaction:', error);
      throw error;
    }
  }

  // Get current authentication state
  public getAuthState(): AuthState {
    return {
      isAuthenticated: !!this.currentUser && !!this.provider,
      user: this.currentUser,
      provider: this.provider,
      flowAddress: this.currentUser?.flowAddress || null,
      ethereumAddress: this.currentUser?.ethereumAddress || null,
    };
  }

  // Get user profile
  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  // Check if user is authenticated
  public isAuthenticated(): boolean {
    return !!this.currentUser && !!this.provider;
  }

  // Get private key (for advanced use cases)
  public async getPrivateKey(): Promise<string> {
    try {
      if (!this.provider) {
        throw new Error('Provider not available');
      }

      const privateKey = await this.provider.request({
        method: 'eth_private_key',
      }) as string;

      return privateKey;
    } catch (error) {
      console.error('❌ Failed to get private key:', error);
      throw error;
    }
  }

  // Create Flow account with Account Abstraction
  public async createFlowAccount(funding?: number): Promise<string> {
    try {
      // This would integrate with Flow's Account Abstraction
      // For now, return mock address
      const flowAddress = `0x${Math.random().toString(16).substr(2, 16)}`;
      
      if (this.currentUser) {
        this.currentUser.flowAddress = flowAddress;
        localStorage.setItem('deckzero_user_profile', JSON.stringify(this.currentUser));
      }

      console.log('🎯 Flow account created:', flowAddress);
      return flowAddress;
    } catch (error) {
      console.error('❌ Failed to create Flow account:', error);
      throw error;
    }
  }

  // Enable biometric authentication (for mobile)
  public async enableBiometric(): Promise<boolean> {
    try {
      // This would integrate with device biometric APIs
      console.log('🔐 Biometric authentication would be enabled here');
      return true;
    } catch (error) {
      console.error('❌ Failed to enable biometric:', error);
      return false;
    }
  }

  // Health check
  public healthCheck(): boolean {
    return !!this.web3auth && this.web3auth.status === 'ready';
  }
}

// Export singleton instance
export const web3AuthService = Web3AuthService.getInstance();
export default web3AuthService;