using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Runtime.InteropServices;
using Newtonsoft.Json;

namespace DeckZero.Blockchain
{
    /// <summary>
    /// Manages WalletConnect integration for Unity
    /// </summary>
    public class WalletConnectManager : MonoBehaviour
    {
        [Header("WalletConnect Configuration")]
        public string projectId = "YOUR_WALLETCONNECT_PROJECT_ID";
        public string appName = "DeckZero";
        public string appDescription = "Blockchain Gaming Platform";
        public string appUrl = "https://deckzero.app";
        public string[] appIcons = { "https://deckzero.app/icon.png" };
        
        [Header("Ethereum Configuration")]
        public string[] supportedChains = { "eip155:1", "eip155:11155111" }; // Mainnet and Sepolia
        
        private string walletConnectUri;
        private bool isConnected = false;
        private string connectedAddress;
        private int connectedChainId;
        
        // Events
        public event Action<string> OnWalletConnected;
        public event Action OnWalletDisconnected;
        public event Action<string> OnConnectionError;
        public event Action<string, string> OnTransactionComplete;
        
        #region Unity Lifecycle
        
        private void Start()
        {
            InitializeWalletConnect();
        }
        
        #endregion
        
        #region WalletConnect Initialization
        
        private void InitializeWalletConnect()
        {
            try
            {
                Debug.Log("🔄 Initializing WalletConnect...");
                
                // Initialize WalletConnect SDK
                var config = new WalletConnectConfig
                {
                    ProjectId = projectId,
                    AppName = appName,
                    AppDescription = appDescription,
                    AppUrl = appUrl,
                    AppIcons = appIcons,
                    SupportedChains = supportedChains
                };
                
                InitializeWalletConnectSDK(JsonConvert.SerializeObject(config));
                Debug.Log("✅ WalletConnect initialized");
            }
            catch (Exception ex)
            {
                Debug.LogError($"Failed to initialize WalletConnect: {ex.Message}");
                OnConnectionError?.Invoke($"WalletConnect initialization failed: {ex.Message}");
            }
        }
        
        #endregion
        
        #region Public Methods
        
        /// <summary>
        /// Connect to a wallet
        /// </summary>
        public void ConnectWallet()
        {
            try
            {
                Debug.Log("🔗 Initiating wallet connection...");
                StartWalletConnect();
            }
            catch (Exception ex)
            {
                Debug.LogError($"Failed to start wallet connection: {ex.Message}");
                OnConnectionError?.Invoke($"Connection failed: {ex.Message}");
            }
        }
        
        /// <summary>
        /// Disconnect from wallet
        /// </summary>
        public void DisconnectWallet()
        {
            try
            {
                Debug.Log("🔌 Disconnecting wallet...");
                DisconnectWalletConnect();
                
                isConnected = false;
                connectedAddress = null;
                connectedChainId = 0;
                
                OnWalletDisconnected?.Invoke();
            }
            catch (Exception ex)
            {
                Debug.LogError($"Failed to disconnect wallet: {ex.Message}");
            }
        }
        
        /// <summary>
        /// Send a transaction through WalletConnect
        /// </summary>
        public void SendTransaction(string to, string data, string value = "0x0")
        {
            try
            {
                if (!isConnected)
                {
                    OnConnectionError?.Invoke("Wallet not connected");
                    return;
                }
                
                var transactionData = new TransactionData
                {
                    To = to,
                    Data = data,
                    Value = value,
                    From = connectedAddress
                };
                
                Debug.Log($"📤 Sending transaction: {JsonConvert.SerializeObject(transactionData)}");
                SendWalletConnectTransaction(JsonConvert.SerializeObject(transactionData));
            }
            catch (Exception ex)
            {
                Debug.LogError($"Failed to send transaction: {ex.Message}");
                OnConnectionError?.Invoke($"Transaction failed: {ex.Message}");
            }
        }
        
        /// <summary>
        /// Switch to a different chain
        /// </summary>
        public void SwitchChain(int chainId)
        {
            try
            {
                if (!isConnected)
                {
                    OnConnectionError?.Invoke("Wallet not connected");
                    return;
                }
                
                Debug.Log($"🔄 Switching to chain: {chainId}");
                SwitchWalletConnectChain(chainId);
            }
            catch (Exception ex)
            {
                Debug.LogError($"Failed to switch chain: {ex.Message}");
                OnConnectionError?.Invoke($"Chain switch failed: {ex.Message}");
            }
        }
        
        #endregion
        
        #region JavaScript Bridge Methods
        
#if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")]
        private static extern void InitializeWalletConnectSDK(string config);
        
        [DllImport("__Internal")]
        private static extern void StartWalletConnect();
        
        [DllImport("__Internal")]
        private static extern void DisconnectWalletConnect();
        
        [DllImport("__Internal")]
        private static extern void SendWalletConnectTransaction(string transactionData);
        
        [DllImport("__Internal")]
        private static extern void SwitchWalletConnectChain(int chainId);
#else
        // Mock implementations for editor testing
        private void InitializeWalletConnectSDK(string config)
        {
            Debug.Log($"[Mock] InitializeWalletConnectSDK called with: {config}");
        }
        
        private void StartWalletConnect()
        {
            Debug.Log("[Mock] StartWalletConnect called");
            // Simulate successful connection after 2 seconds
            StartCoroutine(SimulateWalletConnection());
        }
        
        private void DisconnectWalletConnect()
        {
            Debug.Log("[Mock] DisconnectWalletConnect called");
        }
        
        private void SendWalletConnectTransaction(string transactionData)
        {
            Debug.Log($"[Mock] SendWalletConnectTransaction called with: {transactionData}");
            // Simulate transaction completion
            StartCoroutine(SimulateTransactionComplete());
        }
        
        private void SwitchWalletConnectChain(int chainId)
        {
            Debug.Log($"[Mock] SwitchWalletConnectChain called with chainId: {chainId}");
            connectedChainId = chainId;
        }
        
        private IEnumerator SimulateWalletConnection()
        {
            yield return new WaitForSeconds(2f);
            
            // Simulate successful connection
            isConnected = true;
            connectedAddress = "0x1234567890123456789012345678901234567890";
            connectedChainId = 1; // Mainnet
            
            OnWalletConnected?.Invoke(connectedAddress);
        }
        
        private IEnumerator SimulateTransactionComplete()
        {
            yield return new WaitForSeconds(3f);
            
            string mockTxHash = "0xabcdef123456789012345678901234567890abcdef123456789012345678901234567890";
            OnTransactionComplete?.Invoke(mockTxHash, "success");
        }
#endif
        
        #endregion
        
        #region Callback Methods (Called from JavaScript)
        
        /// <summary>
        /// Called when wallet connection is successful
        /// </summary>
        public void OnWalletConnectSuccess(string addressAndChain)
        {
            try
            {
                var data = JsonConvert.DeserializeObject<ConnectionData>(addressAndChain);
                
                isConnected = true;
                connectedAddress = data.Address;
                connectedChainId = data.ChainId;
                
                Debug.Log($"✅ Wallet connected successfully: {connectedAddress} on chain {connectedChainId}");
                OnWalletConnected?.Invoke(connectedAddress);
            }
            catch (Exception ex)
            {
                Debug.LogError($"Failed to process wallet connection success: {ex.Message}");
                OnConnectionError?.Invoke($"Connection processing failed: {ex.Message}");
            }
        }
        
        /// <summary>
        /// Called when wallet connection fails
        /// </summary>
        public void OnWalletConnectError(string error)
        {
            Debug.LogError($"❌ Wallet connection failed: {error}");
            
            isConnected = false;
            connectedAddress = null;
            connectedChainId = 0;
            
            OnConnectionError?.Invoke(error);
        }
        
        /// <summary>
        /// Called when wallet is disconnected
        /// </summary>
        public void OnWalletConnectDisconnect()
        {
            Debug.Log("🔌 Wallet disconnected");
            
            isConnected = false;
            connectedAddress = null;
            connectedChainId = 0;
            
            OnWalletDisconnected?.Invoke();
        }
        
        /// <summary>
        /// Called when transaction is completed
        /// </summary>
        public void OnTransactionCompleted(string result)
        {
            try
            {
                var data = JsonConvert.DeserializeObject<TransactionResult>(result);
                
                Debug.Log($"✅ Transaction completed: {data.Hash} - Status: {data.Status}");
                OnTransactionComplete?.Invoke(data.Hash, data.Status);
            }
            catch (Exception ex)
            {
                Debug.LogError($"Failed to process transaction result: {ex.Message}");
                OnConnectionError?.Invoke($"Transaction processing failed: {ex.Message}");
            }
        }
        
        #endregion
        
        #region Properties
        
        public bool IsConnected => isConnected;
        public string ConnectedAddress => connectedAddress;
        public int ConnectedChainId => connectedChainId;
        
        #endregion
        
        #region Data Classes
        
        [Serializable]
        public class WalletConnectConfig
        {
            public string ProjectId;
            public string AppName;
            public string AppDescription;
            public string AppUrl;
            public string[] AppIcons;
            public string[] SupportedChains;
        }
        
        [Serializable]
        public class ConnectionData
        {
            public string Address;
            public int ChainId;
        }
        
        [Serializable]
        public class TransactionData
        {
            public string To;
            public string Data;
            public string Value;
            public string From;
        }
        
        [Serializable]
        public class TransactionResult
        {
            public string Hash;
            public string Status;
        }
        
        #endregion
    }
}