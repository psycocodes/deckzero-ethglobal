// Unity WebGL Bridge for Web3 Integration
// This file provides the JavaScript functions that Unity calls via DllImport

let provider = null;
let signer = null;
let contract = null;
let unityGameObject = null;
let unitySendMessage = null;

// Contract configuration
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x6a821521b3C6a3E6298E222082c927bFdE0ddA38";
const CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "getNumber",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "num", "type": "uint256"}],
    "name": "setNumber",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "storedNumber",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Initialize the bridge
export function initUnityBridge(gameObjectName = "BlockchainManager", walletInfo = null) {
  unityGameObject = gameObjectName;
  unitySendMessage = window.unitySendMessage;
  
  // Store wallet information if provided
  if (walletInfo) {
    window.walletInfo = walletInfo;
    console.log("Wallet info stored:", {
      address: walletInfo.walletAddress,
      chainId: walletInfo.chainId
    });
    
    // Initialize contract with the provided wallet client
    initializeContractWithWallet(walletInfo);
  }
  
  // Make sure all functions are available globally for Unity
  if (typeof window !== 'undefined') {
    // These functions are already defined below, just ensuring they're available
    console.log("Unity Web3 Bridge initialized - functions available:", {
      connectWallet: typeof window.connectWallet,
      getWalletAddress: typeof window.getWalletAddress,
      unitySendTx: typeof window.unitySendTx,
      unityCall: typeof window.unityCall
    });
  }
}

// Initialize contract with wallet information from main page
async function initializeContractWithWallet(walletInfo) {
  try {
    console.log("Initializing contract with wallet info...");
    
    if (typeof window.ethers === 'undefined') {
      throw new Error("Ethers.js not loaded");
    }
    
    // Create provider from the wallet client if available
    if (walletInfo.walletClient && window.ethereum) {
      provider = new window.ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      
      // Verify the signer address matches
      const signerAddress = await signer.getAddress();
      console.log("Signer address:", signerAddress);
      console.log("Expected address:", walletInfo.walletAddress);
      
      if (signerAddress.toLowerCase() !== walletInfo.walletAddress.toLowerCase()) {
        console.warn("Signer address mismatch, but continuing...");
      }
      
      // Initialize contract
      contract = new window.ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      console.log("Contract initialized successfully");
      
      // Send success to Unity
      if (unitySendMessage && unityGameObject) {
        unitySendMessage(unityGameObject, "OnWalletConnected", walletInfo.walletAddress);
      }
    } else {
      console.warn("No wallet client provided, transactions may not work");
    }
  } catch (error) {
    console.error("Failed to initialize contract:", error);
    if (unitySendMessage && unityGameObject) {
      unitySendMessage(unityGameObject, "OnError", "Failed to initialize contract: " + error.message);
    }
  }
}

// Connect wallet function - called from Unity (only in browser)
if (typeof window !== 'undefined') {
  window.connectWallet = async function() {
    try {
      console.log("Connecting wallet...");
      
      // Check for any Ethereum provider (MetaMask, Coinbase, etc.)
      if (typeof window.ethereum !== 'undefined') {
        console.log("Ethereum provider detected:", {
          isMetaMask: window.ethereum.isMetaMask,
          isCoinbaseWallet: window.ethereum.isCoinbaseWallet,
          providers: window.ethereum.providers?.length || 1
        });
        
        // Request account access
        console.log("Requesting account access...");
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log("Accounts received:", accounts);
        
        // Create provider and signer
        if (typeof window.ethers === 'undefined') {
          throw new Error("Ethers.js not loaded. Please ensure ethers is available globally.");
        }
        
        provider = new window.ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        
        // Get wallet address
        const address = await signer.getAddress();
        console.log("Wallet connected successfully:", address);
        
        // Create contract instance
        contract = new window.ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        
        // Check if we're on Sepolia testnet (chain ID 11155111)
        const network = await provider.getNetwork();
        console.log("Current network:", {
          name: network.name,
          chainId: network.chainId.toString(),
          isTestnet: network.chainId === 11155111n
        });
        
        if (network.chainId !== 11155111n) {
          try {
            // Try to switch to Sepolia
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0xAA36A7' }], // 11155111 in hex
            });
          } catch (switchError) {
            // If Sepolia is not added, add it
            if (switchError.code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: '0xAA36A7',
                    chainName: 'Sepolia test network',
                    rpcUrls: ['https://sepolia.infura.io/v3/'],
                    blockExplorerUrls: ['https://sepolia.etherscan.io/'],
                    nativeCurrency: {
                      name: 'Ethereum',
                      symbol: 'ETH',
                      decimals: 18,
                    },
                  },
                ],
              });
            } else {
              console.warn("Failed to switch network:", switchError);
              // Continue anyway - user might want to test on different network
            }
          }
        }
        
        // Send success callback to Unity
        if (unitySendMessage && unityGameObject) {
          unitySendMessage(unityGameObject, "OnWalletConnected", address);
        }
        
        return address;
        
      } else {
        throw new Error("No Ethereum wallet detected. Please install MetaMask, Coinbase Wallet, or another compatible wallet.");
      }
    } catch (error) {
      console.error("Wallet connection failed:", error);
      
      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.code === 4001) {
        errorMessage = "User rejected the connection request";
      } else if (error.code === -32002) {
        errorMessage = "Wallet connection request already pending";
      } else if (error.message.includes("fetch")) {
        errorMessage = "Network connection failed. Please check your internet connection and try again.";
      }
      
      if (unitySendMessage && unityGameObject) {
        unitySendMessage(unityGameObject, "OnError", errorMessage);
      }
      
      throw new Error(errorMessage);
    }
  };

// Get wallet address - called from Unity
  window.getWalletAddress = async function() {
  try {
    // First try to use stored wallet info from the main page
    if (window.walletInfo && window.walletInfo.walletAddress) {
      const address = window.walletInfo.walletAddress;
      console.log("Using stored wallet address:", address);
      if (unitySendMessage && unityGameObject) {
        unitySendMessage(unityGameObject, "OnWalletConnected", address);
      }
      return address;
    }
    
    // Fallback to signer if available
    if (signer) {
      const address = await signer.getAddress();
      if (unitySendMessage && unityGameObject) {
        unitySendMessage(unityGameObject, "OnWalletConnected", address);
      }
      return address;
    } 
    
    throw new Error("No wallet connection found. Please connect wallet on the main page first.");
  } catch (error) {
    console.error("Get wallet address failed:", error);
    if (unitySendMessage && unityGameObject) {
      unitySendMessage(unityGameObject, "OnError", error.message);
    }
    throw error;
  }
};

// Send transaction - called from Unity
  window.unitySendTx = async function(funcName, argsJson) {
  try {
    console.log(`Sending transaction: ${funcName} with args: ${argsJson}`);
    
    if (!contract) {
      throw new Error("Contract not initialized. Please ensure wallet is connected on the main page.");
    }
    
    if (!signer) {
      throw new Error("Signer not available. Please ensure wallet is connected on the main page.");
    }
    
    // Verify we're on the correct network
    const network = await provider.getNetwork();
    console.log("Current network:", network.chainId.toString());
    
    if (network.chainId !== 11155111n) {
      throw new Error(`Wrong network. Please switch to Sepolia testnet (Chain ID: 11155111). Current: ${network.chainId}`);
    }
    
    const args = JSON.parse(argsJson);
    let tx;
    
    console.log("Calling contract function with args:", args);
    
    switch (funcName) {
      case 'setNumber':
        // Add gas estimation for better error reporting
        try {
          const gasEstimate = await contract.setNumber.estimateGas(args[0]);
          console.log("Gas estimate:", gasEstimate.toString());
          tx = await contract.setNumber(args[0], { gasLimit: gasEstimate });
        } catch (estimateError) {
          console.error("Gas estimation failed:", estimateError);
          throw new Error(`Gas estimation failed: ${estimateError.message}`);
        }
        break;
      default:
        throw new Error(`Unknown function: ${funcName}`);
    }
    
    console.log("Transaction sent:", tx.hash);
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log("Transaction mined:", receipt);
    
    // Send success callback to Unity
    if (unitySendMessage && unityGameObject) {
      unitySendMessage(unityGameObject, "OnTxComplete", tx.hash);
    }
    
  } catch (error) {
    console.error("Transaction failed:", error);
    if (unitySendMessage && unityGameObject) {
      unitySendMessage(unityGameObject, "OnError", error.message);
    }
  }
};

// Call contract function (read-only) - called from Unity
  window.unityCall = async function(funcName, argsJson) {
  try {
    console.log(`Calling function: ${funcName} with args: ${argsJson}`);
    
    if (!contract) {
      throw new Error("Contract not initialized");
    }
    
    const args = JSON.parse(argsJson);
    let result;
    
    switch (funcName) {
      case 'getNumber':
        result = await contract.getNumber();
        break;
      case 'storedNumber':
        result = await contract.storedNumber();
        break;
      default:
        throw new Error(`Unknown function: ${funcName}`);
    }
    
    console.log("Function result:", result.toString());
    
    // Send result back to Unity
    if (unitySendMessage && unityGameObject) {
      unitySendMessage(unityGameObject, "OnCallComplete", result.toString());
    }
    
  } catch (error) {
    console.error("Contract call failed:", error);
    if (unitySendMessage && unityGameObject) {
      unitySendMessage(unityGameObject, "OnError", error.message);
    }
  }
  };

  // Wallet event listeners
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length === 0) {
        // User disconnected wallet
        if (unitySendMessage && unityGameObject) {
          unitySendMessage(unityGameObject, "OnWalletDisconnected", "");
        }
      } else {
        // User changed account
        if (unitySendMessage && unityGameObject) {
          unitySendMessage(unityGameObject, "OnWalletConnected", accounts[0]);
        }
      }
    });

    window.ethereum.on('chainChanged', (chainId) => {
      console.log("Chain changed to:", chainId);
      // Reload the page when chain changes to reset the provider
      window.location.reload();
    });
  }

  console.log('Unity Web3 Bridge functions registered');
}

export { CONTRACT_ADDRESS, CONTRACT_ABI };