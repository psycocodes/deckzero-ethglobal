// Configuration for Flow, Ethereum, and Web3Auth
export interface AppConfig {
  flow: FlowConfig;
  ethereum: EthereumConfig;
  web3Auth: Web3AuthConfig;
  walletConnect: WalletConnectConfig;
  game: GameConfig;
  api: ApiConfig;
}

export interface FlowConfig {
  network: 'testnet' | 'mainnet';
  accessNodeUrl: string;
  discoveryWalletUrl: string;
  contracts: {
    gameRewards: string;
    nftCollection: string;
    fungibleToken: string;
  };
  accounts: {
    admin: string;
  };
}

export interface EthereumConfig {
  network: 'mainnet' | 'sepolia' | 'goerli';
  rpcUrl: string;
  contracts: {
    ensRegistry: string;
    ensResolver: string;
    ensReverseRegistrar: string;
  };
  baseDomain: string;
}

export interface Web3AuthConfig {
  clientId: string;
  network: 'sapphire_mainnet' | 'sapphire_devnet';
  chainConfig: {
    chainNamespace: string;
    chainId: string;
    rpcTarget: string;
    displayName: string;
    blockExplorer: string;
    ticker: string;
    tickerName: string;
  };
}

export interface WalletConnectConfig {
  projectId: string;
  chains: number[];
  appMetadata: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
}

export interface GameConfig {
  unityBuildPath: string;
  supportedGames: string[];
  sessionTimeout: number;
  maxPlayersPerSession: number;
}

export interface ApiConfig {
  baseUrl: string;
  endpoints: {
    gameResults: string;
    playerProfile: string;
    rewards: string;
    ensRewards: string;
  };
}

// Environment-based configuration
const getConfig = (): AppConfig => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    flow: {
      network: (process.env.NEXT_PUBLIC_FLOW_NETWORK as 'testnet' | 'mainnet') || 'testnet',
      accessNodeUrl: process.env.NEXT_PUBLIC_FLOW_ACCESS_NODE_URL || 'https://rest-testnet.onflow.org',
      discoveryWalletUrl: process.env.NEXT_PUBLIC_FLOW_DISCOVERY_WALLET_URL || 'https://fcl-discovery.onflow.org/testnet/authn',
      contracts: {
        gameRewards: process.env.NEXT_PUBLIC_FLOW_GAME_REWARDS_CONTRACT || '0x01',
        nftCollection: process.env.NEXT_PUBLIC_FLOW_NFT_CONTRACT || '0x02',
        fungibleToken: process.env.NEXT_PUBLIC_FLOW_TOKEN_CONTRACT || '0x03',
      },
      accounts: {
        admin: process.env.NEXT_PUBLIC_FLOW_ADMIN_ACCOUNT || '0x01',
      },
    },
    ethereum: {
      network: (process.env.NEXT_PUBLIC_ETHEREUM_NETWORK as 'mainnet' | 'sepolia' | 'goerli') || 'sepolia',
      rpcUrl: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID',
      contracts: {
        ensRegistry: process.env.NEXT_PUBLIC_ENS_REGISTRY || '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
        ensResolver: process.env.NEXT_PUBLIC_ENS_RESOLVER || '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
        ensReverseRegistrar: process.env.NEXT_PUBLIC_ENS_REVERSE_REGISTRAR || '0x084b1c3C81545d370f3634392De611CaaBFf8148',
      },
      baseDomain: process.env.NEXT_PUBLIC_ENS_BASE_DOMAIN || 'winner.eth',
    },
    web3Auth: {
      clientId: process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID || '',
      network: isProduction ? 'sapphire_mainnet' : 'sapphire_devnet',
      chainConfig: {
        chainNamespace: 'eip155',
        chainId: '0x1', // Ethereum mainnet
        rpcTarget: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
        displayName: 'Ethereum Mainnet',
        blockExplorer: 'https://etherscan.io/',
        ticker: 'ETH',
        tickerName: 'Ethereum',
      },
    },
    walletConnect: {
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
      chains: [1, 11155111], // Mainnet and Sepolia
      appMetadata: {
        name: 'DeckZero',
        description: 'Blockchain Gaming Platform with Flow and ENS Integration',
        url: process.env.NEXT_PUBLIC_APP_URL || 'https://deckzero.app',
        icons: [process.env.NEXT_PUBLIC_APP_ICON || 'https://deckzero.app/icon.png'],
      },
    },
    game: {
      unityBuildPath: '/games/beauty-contest',
      supportedGames: ['beauty-contest'],
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      maxPlayersPerSession: 10,
    },
    api: {
      baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : ''),
      endpoints: {
        gameResults: '/api/game/results',
        playerProfile: '/api/player/profile',
        rewards: '/api/rewards',
        ensRewards: '/api/ens/mint',
      },
    },
  };
};

export const config = getConfig();

// Type guards for configuration validation
export const validateFlowConfig = (config: FlowConfig): boolean => {
  return !!(
    config.accessNodeUrl &&
    config.contracts.gameRewards &&
    config.accounts.admin
  );
};

export const validateEthereumConfig = (config: EthereumConfig): boolean => {
  return !!(
    config.rpcUrl &&
    config.contracts.ensRegistry &&
    config.baseDomain
  );
};

export const validateWeb3AuthConfig = (config: Web3AuthConfig): boolean => {
  return !!(
    config.clientId &&
    config.chainConfig.rpcTarget
  );
};

// Logging configuration
export const logConfig = {
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: 'json',
  transports: [
    'console',
    ...(process.env.NODE_ENV === 'production' ? ['file'] : []),
  ],
};

export default config;