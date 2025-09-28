using System;
using System.Collections;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using UnityEngine;
using Nethereum.Web3;
using Nethereum.Contracts;
using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Hex.HexTypes;
using System.Threading.Tasks;
using Newtonsoft.Json;
using System.Net.Http;
using System.Text;

namespace DeckZero.Blockchain
{
    /// <summary>
    /// Manages Flow blockchain integration and ENS subdomain minting
    /// </summary>
    public class FlowBlockchainManager : MonoBehaviour
    {
        [Header("Flow Configuration")]
        public string flowTestnetRPC = "https://access-testnet.onflow.org";
        public string flowContractAddress = "0x..."; // Your Flow contract address
        public string flowPrivateKey = ""; // For testing - use secure key management in production
        
        [Header("Ethereum Configuration")]
        public string ethereumMainnetRPC = "https://mainnet.infura.io/v3/YOUR_PROJECT_ID";
        public string ensRegistryAddress = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
        public string ensResolverAddress = "0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41";
        public string baseDomain = "winner.eth";
        
        [Header("WalletConnect Configuration")]
        public string walletConnectProjectId = "YOUR_WALLETCONNECT_PROJECT_ID";
        
        private Web3 flowWeb3;
        private Web3 ethereumWeb3;
        private Contract flowContract;
        private Contract ensContract;
        private HttpClient httpClient;
        
        // Address mapping - Flow to Ethereum
        private Dictionary<string, string> addressMapping = new Dictionary<string, string>();
        
        // Minted subdomains tracking
        private HashSet<string> mintedSubdomains = new HashSet<string>();
        
        // Events
        public event Action<string> OnPlayerWonDetected;
        public event Action<string, string> OnSubdomainMinted;
        public event Action<string> OnError;
        
        #region Unity Lifecycle
        
        private void Start()
        {
            InitializeBlockchainConnections();
            LoadAddressMapping();
            StartListeningForFlowEvents();
        }
        
        private void OnDestroy()
        {
            StopListeningForFlowEvents();
            httpClient?.Dispose();
        }
        
        #endregion
        
        #region Initialization
        
        private async void InitializeBlockchainConnections()
        {
            try
            {
                // Initialize HTTP client
                httpClient = new HttpClient();
                
                // Initialize Flow connection
                flowWeb3 = new Web3(flowTestnetRPC);
                Debug.Log("✅ Flow Testnet connection established");
                
                // Initialize Ethereum connection (will be updated with WalletConnect)
                ethereumWeb3 = new Web3(ethereumMainnetRPC);
                Debug.Log("✅ Ethereum connection established");
                
                // Initialize contracts
                await InitializeContracts();
                
                Debug.Log("🚀 Flow-Ethereum Bridge initialized successfully!");
            }
            catch (Exception ex)
            {
                LogError($"Failed to initialize blockchain connections: {ex.Message}");
            }
        }
        
        private async Task InitializeContracts()
        {
            try
            {
                // Flow contract ABI (simplified)
                string flowContractAbi = @"[
                    {
                        'type': 'event',
                        'name': 'PlayerWon',
                        'inputs': [
                            {'name': 'gameId', 'type': 'uint256', 'indexed': true},
                            {'name': 'winner', 'type': 'address', 'indexed': true},
                            {'name': 'timestamp', 'type': 'uint256', 'indexed': false}
                        ]
                    }
                ]";
                
                // ENS Registry ABI (simplified)
                string ensRegistryAbi = @"[
                    {
                        'type': 'function',
                        'name': 'setSubnodeOwner',
                        'inputs': [
                            {'name': 'node', 'type': 'bytes32'},
                            {'name': 'label', 'type': 'bytes32'},
                            {'name': 'owner', 'type': 'address'}
                        ],
                        'outputs': []
                    }
                ]";
                
                flowContract = flowWeb3.Eth.GetContract(flowContractAbi, flowContractAddress);
                ensContract = ethereumWeb3.Eth.GetContract(ensRegistryAbi, ensRegistryAddress);
                
                Debug.Log("📜 Smart contracts initialized");
            }
            catch (Exception ex)
            {
                LogError($"Failed to initialize contracts: {ex.Message}");
            }
        }
        
        #endregion
        
        #region Address Mapping
        
        private void LoadAddressMapping()
        {
            try
            {
                // Load from JSON file or Resources
                string jsonPath = Application.streamingAssetsPath + "/flow-ethereum-mapping.json";
                
                if (System.IO.File.Exists(jsonPath))
                {
                    string json = System.IO.File.ReadAllText(jsonPath);
                    var mappingData = JsonConvert.DeserializeObject<Dictionary<string, string>>(json);
                    
                    foreach (var kvp in mappingData)
                    {
                        addressMapping[kvp.Key.ToLower()] = kvp.Value.ToLower();
                    }
                    
                    Debug.Log($"📋 Loaded {addressMapping.Count} address mappings");
                }
                else
                {
                    Debug.LogWarning("⚠️ Address mapping file not found. Creating default mapping...");
                    CreateDefaultMapping();
                }
            }
            catch (Exception ex)
            {
                LogError($"Failed to load address mapping: {ex.Message}");
                CreateDefaultMapping();
            }
        }
        
        private void CreateDefaultMapping()
        {
            // Default mapping for testing
            addressMapping = new Dictionary<string, string>
            {
                {"0x1234...flow", "0x5678...eth"}, // Example mapping
                // Add more mappings as needed
            };
        }
        
        public void AddAddressMapping(string flowAddress, string ethereumAddress)
        {
            addressMapping[flowAddress.ToLower()] = ethereumAddress.ToLower();
            SaveAddressMapping();
        }
        
        private void SaveAddressMapping()
        {
            try
            {
                string jsonPath = Application.streamingAssetsPath + "/flow-ethereum-mapping.json";
                string json = JsonConvert.SerializeObject(addressMapping, Formatting.Indented);
                System.IO.File.WriteAllText(jsonPath, json);
                Debug.Log("💾 Address mapping saved");
            }
            catch (Exception ex)
            {
                LogError($"Failed to save address mapping: {ex.Message}");
            }
        }
        
        #endregion
        
        #region Flow Event Listening
        
        private bool isListening = false;
        private Coroutine eventListenerCoroutine;
        
        private void StartListeningForFlowEvents()
        {
            if (!isListening)
            {
                isListening = true;
                eventListenerCoroutine = StartCoroutine(ListenForPlayerWonEvents());
                Debug.Log("👂 Started listening for Flow events...");
            }
        }
        
        private void StopListeningForFlowEvents()
        {
            if (isListening)
            {
                isListening = false;
                if (eventListenerCoroutine != null)
                {
                    StopCoroutine(eventListenerCoroutine);
                }
                Debug.Log("🛑 Stopped listening for Flow events");
            }
        }
        
        private IEnumerator ListenForPlayerWonEvents()
        {
            while (isListening)
            {
                try
                {
                    yield return StartCoroutine(CheckForNewPlayerWonEvents());
                }
                catch (Exception ex)
                {
                    LogError($"Error in event listener: {ex.Message}");
                }
                
                // Wait 5 seconds before checking again
                yield return new WaitForSeconds(5f);
            }
        }
        
        private IEnumerator CheckForNewPlayerWonEvents()
        {
            // Implementation for checking Flow blockchain events
            // This would typically involve:
            // 1. Query latest block
            // 2. Check for PlayerWon events since last check
            // 3. Process any new events
            
            // Placeholder implementation - replace with actual Flow API calls
            yield return new WaitForSeconds(1f);
            
            // Simulate event detection for testing
            if (UnityEngine.Random.value < 0.001f) // Very low probability for testing
            {
                string mockFlowAddress = "0x1234...flow";
                OnPlayerWonEventDetected(mockFlowAddress);
            }
        }
        
        private void OnPlayerWonEventDetected(string flowWinnerAddress)
        {
            Debug.Log($"🎉 PlayerWon event detected for address: {flowWinnerAddress}");
            OnPlayerWonDetected?.Invoke(flowWinnerAddress);
            
            // Process the win
            StartCoroutine(ProcessPlayerWin(flowWinnerAddress));
        }
        
        #endregion
        
        #region ENS Subdomain Minting
        
        private IEnumerator ProcessPlayerWin(string flowWinnerAddress)
        {
            try
            {
                // Get Ethereum address from mapping
                if (!addressMapping.TryGetValue(flowWinnerAddress.ToLower(), out string ethereumAddress))
                {
                    LogError($"No Ethereum address mapping found for Flow address: {flowWinnerAddress}");
                    yield break;
                }
                
                // Generate subdomain name
                string subdomain = GenerateSubdomain(flowWinnerAddress);
                string fullDomain = $"{subdomain}.{baseDomain}";
                
                // Check if already minted
                if (mintedSubdomains.Contains(fullDomain))
                {
                    Debug.Log($"⚠️ Subdomain {fullDomain} already minted for this winner");
                    yield break;
                }
                
                // Connect to Ethereum via WalletConnect and mint ENS subdomain
                yield return StartCoroutine(ConnectWalletAndMintENS(ethereumAddress, subdomain));
                
            }
            catch (Exception ex)
            {
                LogError($"Failed to process player win: {ex.Message}");
            }
        }
        
        private string GenerateSubdomain(string flowAddress)
        {
            // Generate a subdomain based on the Flow address
            // For example: "seven" for the 7th winner, or based on address hash
            string addressHash = flowAddress.GetHashCode().ToString("X");
            return $"winner{addressHash.Substring(0, Math.Min(6, addressHash.Length))}";
        }
        
        private IEnumerator ConnectWalletAndMintENS(string ethereumAddress, string subdomain)
        {
            try
            {
                Debug.Log($"🔗 Connecting to Ethereum wallet for address: {ethereumAddress}");
                
                // Initialize WalletConnect (simplified - you'll need actual WalletConnect integration)
                yield return StartCoroutine(InitializeWalletConnect());
                
                // Mint ENS subdomain
                yield return StartCoroutine(MintENSSubdomain(ethereumAddress, subdomain));
                
            }
            catch (Exception ex)
            {
                LogError($"Failed to connect wallet and mint ENS: {ex.Message}");
            }
        }
        
        private IEnumerator InitializeWalletConnect()
        {
            // Placeholder for WalletConnect initialization
            // In a real implementation, you would:
            // 1. Initialize WalletConnect SDK
            // 2. Create connection session
            // 3. Request wallet connection
            // 4. Wait for user approval
            
            Debug.Log("🔄 Initializing WalletConnect...");
            yield return new WaitForSeconds(2f); // Simulate connection time
            Debug.log("✅ WalletConnect initialized");
        }
        
        private IEnumerator MintENSSubdomain(string ethereumAddress, string subdomain)
        {
            try
            {
                string fullDomain = $"{subdomain}.{baseDomain}";
                Debug.Log($"🏷️ Minting ENS subdomain: {fullDomain}");
                
                // Calculate namehash for the base domain
                byte[] baseNamehash = CalculateNamehash(baseDomain);
                
                // Calculate label hash for subdomain
                byte[] labelHash = Keccak256(Encoding.UTF8.GetBytes(subdomain));
                
                // Prepare transaction
                var setSubnodeFunction = ensContract.GetFunction("setSubnodeOwner");
                
                // Estimate gas
                var gasEstimate = await setSubnodeFunction.EstimateGasAsync(
                    baseNamehash, 
                    labelHash, 
                    ethereumAddress
                );
                
                // Send transaction
                var transactionReceipt = await setSubnodeFunction.SendTransactionAndWaitForReceiptAsync(
                    ethereumAddress, // from
                    gasEstimate,     // gas
                    null,           // value
                    baseNamehash,    // node
                    labelHash,       // label
                    ethereumAddress  // owner
                );
                
                if (transactionReceipt.Status.Value == 1)
                {
                    mintedSubdomains.Add(fullDomain);
                    Debug.Log($"✅ ENS subdomain minted successfully: {fullDomain}");
                    Debug.Log($"📋 Transaction hash: {transactionReceipt.TransactionHash}");
                    OnSubdomainMinted?.Invoke(fullDomain, transactionReceipt.TransactionHash);
                }
                else
                {
                    LogError($"❌ ENS subdomain minting failed for: {fullDomain}");
                }
            }
            catch (Exception ex)
            {
                LogError($"Failed to mint ENS subdomain: {ex.Message}");
            }
            
            yield return null;
        }
        
        #endregion
        
        #region Utility Methods
        
        private byte[] CalculateNamehash(string domain)
        {
            // ENS namehash calculation
            // This is a simplified version - use a proper ENS library for production
            var parts = domain.Split('.');
            byte[] hash = new byte[32]; // Empty hash (0x00...)
            
            for (int i = parts.Length - 1; i >= 0; i--)
            {
                var labelHash = Keccak256(Encoding.UTF8.GetBytes(parts[i]));
                var combined = new byte[64];
                Array.Copy(hash, 0, combined, 0, 32);
                Array.Copy(labelHash, 0, combined, 32, 32);
                hash = Keccak256(combined);
            }
            
            return hash;
        }
        
        private byte[] Keccak256(byte[] input)
        {
            // Use Nethereum's Keccak256 implementation
            return Nethereum.Util.Sha3Keccack.Current.CalculateHash(input);
        }
        
        private void LogError(string message)
        {
            Debug.LogError($"[FlowBlockchainManager] {message}");
            OnError?.Invoke(message);
        }
        
        #endregion
        
        #region Public API
        
        /// <summary>
        /// Manually trigger player won event (for testing)
        /// </summary>
        public void TriggerPlayerWonEvent(string flowAddress)
        {
            OnPlayerWonEventDetected(flowAddress);
        }
        
        /// <summary>
        /// Get the current address mapping
        /// </summary>
        public Dictionary<string, string> GetAddressMapping()
        {
            return new Dictionary<string, string>(addressMapping);
        }
        
        /// <summary>
        /// Check if a subdomain has been minted
        /// </summary>
        public bool IsSubdomainMinted(string subdomain)
        {
            return mintedSubdomains.Contains($"{subdomain}.{baseDomain}");
        }
        
        /// <summary>
        /// Get all minted subdomains
        /// </summary>
        public string[] GetMintedSubdomains()
        {
            return mintedSubdomains.ToArray();
        }
        
        #endregion
    }
}