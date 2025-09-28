"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Unity, useUnityContext } from "react-unity-webgl";
import { Expand, User, Trophy, Settings } from "lucide-react";
import { isMobileDevice } from "@/utils/isMobile";
import { useAccount, useWalletClient } from "wagmi";

// Services
import { flowService } from "@/services/flow";
import { ensService } from "@/services/ens";
import { web3AuthService } from "@/services/web3auth";

interface GameWrapperProps {
  gameId: string;
}

// Unity game result structure (from WebResultReporter)
interface UnityGameResult {
  gameSessionId: string;
  winnerUserId: string;
  winnerUsername: string;
  players: Array<{
    userId: string;
    username: string;
    score: number;
    rank?: number;
    address?: string;
  }>;
  rounds: Array<{
    roundNumber: number;
    submissions: Array<{
      userId: string;
      value: number;
      timestamp: string;
    }>;
    target: number;
    results: Array<{
      userId: string;
      deviation: number;
      score: number;
    }>;
  }>;
  totalRounds: number;
  gameDurationSeconds: number;
  gameEndTime: string;
  gameType: string;
}

// Legacy interface for backwards compatibility
interface GameResult {
  gameSessionId: string;
  gameType: string;
  winnerId: string;
  playerList: Array<{
    id: string;
    address: string;
    score: number;
    rank: number;
  }>;
  gameStats: {
    duration: number;
    totalRounds: number;
    startTime: number;
    endTime: number;
  };
  achievement?: string;
  metadata?: Record<string, any>;
}

export default function EnhancedGameWrapper({ gameId }: GameWrapperProps) {
  console.log("Enhanced GameWrapper initialized with gameId:", gameId);

  // State management
  const [isFlowConnected, setIsFlowConnected] = useState(false);
  const [isWeb3AuthReady, setIsWeb3AuthReady] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [gameSession, setGameSession] = useState<string>("");
  const [isProcessingResult, setIsProcessingResult] = useState(false);
  const [gameError, setGameError] = useState<string | null>(null);

  // Existing wagmi hooks
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();

  const unityContextConfig = {
    loaderUrl: `/games/${gameId}/Build/${gameId}.loader.js`,
    dataUrl: `/games/${gameId}/Build/${gameId}.data.br`,
    frameworkUrl: `/games/${gameId}/Build/${gameId}.framework.js.br`,
    codeUrl: `/games/${gameId}/Build/${gameId}.wasm.br`,
  };

  console.log("Unity context config:", unityContextConfig);

  const {
    unityProvider,
    requestFullscreen,
    isLoaded,
    loadingProgression,
    sendMessage,
    addEventListener,
    removeEventListener,
  } = useUnityContext(unityContextConfig);

  // Initialize services on component mount
  useEffect(() => {
    initializeServices();
  }, []);

  // Initialize Web3 services
  const initializeServices = async () => {
    try {
      console.log("🚀 Initializing Web3 services...");
      
      // Initialize Web3Auth
      await web3AuthService.initialize();
      setIsWeb3AuthReady(true);
      
      // Check if user is already authenticated
      if (web3AuthService.isAuthenticated()) {
        const user = web3AuthService.getCurrentUser();
        setUserProfile(user);
        console.log("✅ User already authenticated:", user);
      }
      
      // Initialize ENS service
      await ensService.initialize();
      
      console.log("✅ All services initialized");
    } catch (error) {
      console.error("❌ Failed to initialize services:", error);
      setGameError("Failed to initialize blockchain services");
    }
  };

  // Initialize Unity bridge when game loads
  useEffect(() => {
    const initializeBridge = async () => {
      if (isLoaded && isWeb3AuthReady) {
        console.log("🎮 Unity game loaded, initializing bridge...");

        try {
          // Generate game session ID
          const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          setGameSession(sessionId);

          // Set up Unity callbacks
          setupUnityCallbacks();

          // Send initialization data to Unity
          const initData = {
            sessionId,
            playerId: userProfile?.userId || "anonymous",
            flowAddress: userProfile?.flowAddress || "",
            ethereumAddress: userProfile?.ethereumAddress || address || "",
            gameType: gameId,
          };

          console.log("📤 Sending init data to Unity:", initData);
          sendMessage("GameManager", "InitializeGame", JSON.stringify(initData));

        } catch (error) {
          console.error("❌ Failed to initialize Unity bridge:", error);
          setGameError("Failed to initialize game");
        }
      }
    };

    initializeBridge();
  }, [isLoaded, isWeb3AuthReady, userProfile, address, sendMessage, gameId]);

  // Set up Unity message callbacks
  const setupUnityCallbacks = useCallback(() => {
    console.log("🔗 Setting up Unity callbacks...");

    // Handle game results from Unity
    addEventListener("GameResultReceived", handleGameResult);
    
    // Handle player actions
    addEventListener("PlayerActionReceived", handlePlayerAction);
    
    // Handle errors
    addEventListener("GameErrorReceived", handleGameError);

    return () => {
      removeEventListener("GameResultReceived", handleGameResult);
      removeEventListener("PlayerActionReceived", handlePlayerAction);
      removeEventListener("GameErrorReceived", handleGameError);
    };
  }, [addEventListener, removeEventListener]);

  // Handle game result from Unity
  const handleGameResult = async (resultJson: string) => {
    try {
      console.log("🎮 Game result received from Unity:", resultJson);
      setIsProcessingResult(true);

      // Parse the result - could be Unity format or legacy format
      const rawResult = JSON.parse(resultJson);
      
      // Check if it's Unity format (has winnerUserId) or legacy format (has winnerId)
      let gameResult: UnityGameResult;
      
      if ('winnerUserId' in rawResult) {
        // Unity format - use directly
        gameResult = rawResult as UnityGameResult;
        console.log("📤 Using Unity format result");
        
        // Validate Unity format
        if (!gameResult.gameSessionId || !gameResult.winnerUserId) {
          throw new Error("Invalid Unity game result data");
        }
      } else {
        // Legacy format - convert to Unity format
        const legacyResult = rawResult as GameResult;
        console.log("🔄 Converting legacy format to Unity format");
        
        if (!legacyResult.gameSessionId || !legacyResult.winnerId) {
          throw new Error("Invalid legacy game result data");
        }
        
        // Convert legacy to Unity format
        gameResult = {
          gameSessionId: legacyResult.gameSessionId,
          winnerUserId: legacyResult.winnerId,
          winnerUsername: userProfile?.name || 'Player',
          players: legacyResult.playerList.map(p => ({
            userId: p.id,
            username: p.id,
            score: p.score,
            rank: p.rank,
            address: p.address
          })),
          rounds: [], // Legacy format doesn't have rounds
          totalRounds: legacyResult.gameStats.totalRounds,
          gameDurationSeconds: legacyResult.gameStats.duration,
          gameEndTime: new Date(legacyResult.gameStats.endTime).toISOString(),
          gameType: legacyResult.gameType
        } as UnityGameResult;
      }

      // Send result to API for processing  
      const response = await fetch('/api/game-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gameResult),
      });

      const apiResult = await response.json();
      
      if (apiResult.success) {
        console.log("✅ Game result processed successfully:", apiResult);
        
        // Show success message to user
        if (gameResult.winnerUserId === userProfile?.userId) {
          showWinnerNotification(apiResult);
        }
      } else {
        console.error("❌ Game result processing failed:", apiResult.error);
        setGameError("Failed to process game result");
      }

    } catch (error) {
      console.error("❌ Failed to handle game result:", error);
      setGameError("Failed to process game result");
    } finally {
      setIsProcessingResult(false);
    }
  };

  // Handle player actions from Unity
  const handlePlayerAction = async (actionJson: string) => {
    try {
      const action = JSON.parse(actionJson);
      console.log("🎯 Player action received:", action);

      switch (action.type) {
        case 'REQUEST_FLOW_TRANSACTION':
          await handleFlowTransaction(action.data);
          break;
        case 'REQUEST_ENS_CHECK':
          await handleENSCheck(action.data);
          break;
        default:
          console.warn("⚠️ Unknown player action type:", action.type);
      }
    } catch (error) {
      console.error("❌ Failed to handle player action:", error);
    }
  };

  // Handle Flow transactions
  const handleFlowTransaction = async (transactionData: any) => {
    try {
      console.log("🌊 Processing Flow transaction:", transactionData);
      
      // Sign transaction with Web3Auth if needed
      if (userProfile?.flowAddress) {
        const signature = await web3AuthService.signFlowTransaction(transactionData);
        
        // Send signature back to Unity
        sendMessage("GameManager", "FlowTransactionSigned", JSON.stringify({
          transactionId: transactionData.id,
          signature,
        }));
      } else {
        throw new Error("No Flow address available");
      }
    } catch (error) {
      console.error("❌ Flow transaction failed:", error);
      sendMessage("GameManager", "FlowTransactionFailed", JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  // Handle ENS checks
  const handleENSCheck = async (ensData: any) => {
    try {
      const isAvailable = !ensService.isSubdomainMinted(ensData.subdomain);
      
      sendMessage("GameManager", "ENSCheckResult", JSON.stringify({
        subdomain: ensData.subdomain,
        isAvailable,
      }));
    } catch (error) {
      console.error("❌ ENS check failed:", error);
    }
  };

  // Handle game errors
  const handleGameError = (errorMessage: string) => {
    console.error("🎮 Game error:", errorMessage);
    setGameError(errorMessage);
  };

  // Show winner notification
  const showWinnerNotification = (result: any) => {
    console.log("🎉 Showing winner notification:", result);
    
    // Create notification element
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 400px;
        animation: slideIn 0.5s ease-out;
      ">
        <h3 style="margin: 0 0 10px 0; font-size: 18px;">🎉 Congratulations!</h3>
        <p style="margin: 0 0 10px 0;">You won the game!</p>
        ${result.winner?.rewards?.flowNFT ? `<p style="margin: 5px 0;">🌊 Flow NFT Earned!</p>` : ''}
        ${result.winner?.rewards?.ensBadge ? `<p style="margin: 5px 0;">🏷️ ENS Badge: ${result.winner.rewards.ensReward?.fullDomain || 'Badge Earned'}</p>` : ''}
        <button onclick="this.parentElement.remove()" style="
          position: absolute;
          top: 10px;
          right: 10px;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 20px;
        ">×</button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000);
  };

  // User authentication
  const handleLogin = async () => {
    try {
      setGameError(null);
      const user = await web3AuthService.login();
      setUserProfile(user);
      console.log("✅ User logged in:", user);
    } catch (error) {
      console.error("❌ Login failed:", error);
      setGameError("Authentication failed");
    }
  };

  const handleLogout = async () => {
    try {
      await web3AuthService.logout();
      setUserProfile(null);
      console.log("✅ User logged out");
    } catch (error) {
      console.error("❌ Logout failed:", error);
    }
  };

  // Render loading state
  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-br from-purple-900 to-blue-900 text-white">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="text-lg">Loading Game...</p>
          <div className="w-64 bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${loadingProgression * 100}%` }}
            ></div>
          </div>
          <p className="text-sm opacity-75">{Math.round(loadingProgression * 100)}%</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      {/* Game Error Banner */}
      {gameError && (
        <div className="absolute top-4 left-4 right-4 bg-red-600 text-white p-3 rounded-lg z-20 flex items-center justify-between">
          <span>{gameError}</span>
          <button 
            onClick={() => setGameError(null)}
            className="ml-2 text-white hover:text-gray-200"
          >
            ×
          </button>
        </div>
      )}

      {/* Processing Banner */}
      {isProcessingResult && (
        <div className="absolute top-4 left-4 right-4 bg-blue-600 text-white p-3 rounded-lg z-20">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Processing game result...</span>
          </div>
        </div>
      )}

      {/* User Profile Bar */}
      <div className="absolute top-4 right-4 z-20">
        {userProfile ? (
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <User size={16} />
            </div>
            <div className="text-sm">
              <div className="font-medium">{userProfile.name || 'Player'}</div>
              <div className="text-xs opacity-75">
                {userProfile.flowAddress ? `Flow: ${userProfile.flowAddress.slice(0, 8)}...` : 'No Flow wallet'}
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all"
          >
            <User size={16} />
            <span>Login to Play</span>
          </button>
        )}
      </div>

      {/* Game Controls */}
      <div className="absolute bottom-4 right-4 z-20 flex space-x-2">
        {!isMobileDevice() && (
          <button
            onClick={() => requestFullscreen(true)}
            className="bg-black/50 hover:bg-black/70 text-white p-3 rounded-lg backdrop-blur-sm transition-all"
            title="Fullscreen"
          >
            <Expand size={20} />
          </button>
        )}
        
        <button
          onClick={() => window.open('/dashboard', '_blank')}
          className="bg-black/50 hover:bg-black/70 text-white p-3 rounded-lg backdrop-blur-sm transition-all"
          title="Dashboard"
        >
          <Trophy size={20} />
        </button>
      </div>

      {/* Unity Game */}
      <Unity 
        unityProvider={unityProvider} 
        style={{
          width: "100%",
          height: "100vh",
          display: "block",
        }}
        className="unity-canvas"
      />

      {/* Game Info */}
      <div className="absolute bottom-4 left-4 z-20">
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white text-sm">
          <div>Session: {gameSession.slice(-8)}</div>
          {userProfile && (
            <div className="mt-1 text-xs opacity-75">
              Playing as: {userProfile.name || userProfile.userId}
            </div>
          )}
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .unity-canvas {
          outline: none;
        }
      `}</style>
    </div>
  );
}