// API route for receiving game results from Unity WebResultReporter
import { NextRequest, NextResponse } from 'next/server';
import { flowService } from '@/services/flow';
import { ensService } from '@/services/ens';
import { logger } from '@/services/logger';

// Unity game result structure (as expected by WebResultReporter)
interface UnityGameResult {
  gameSessionId: string;
  winnerUserId: string;          // wallet address
  winnerUsername: string;        // player name
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
  gameEndTime: string;           // ISO 8601 format
  gameType: string;              // e.g., "keynesian-beauty-contest"
}

// In-memory storage for address mappings (use database in production)
const addressMappings: Record<string, { flowAddress?: string; ethereumAddress?: string }> = {};

export async function POST(request: NextRequest) {
  try {
    console.log('🎮 Unity game result received');
    
    // Parse Unity game result
    const unityResult: UnityGameResult = await request.json();
    
    // Validate required fields
    if (!unityResult.gameSessionId || !unityResult.winnerUserId || !unityResult.players) {
      console.error('❌ Missing required fields in game result');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: gameSessionId, winnerUserId, or players' 
        },
        { status: 400 }
      );
    }

    console.log('📊 Game Result Details:', {
      sessionId: unityResult.gameSessionId,
      gameType: unityResult.gameType,
      winner: unityResult.winnerUserId,
      playerCount: unityResult.players.length,
      totalRounds: unityResult.totalRounds,
      duration: unityResult.gameDurationSeconds,
      endTime: unityResult.gameEndTime
    });

    // Find winner in players array
    const winner = unityResult.players.find(p => p.userId === unityResult.winnerUserId);
    if (!winner) {
      console.error('❌ Winner not found in players list');
      return NextResponse.json(
        { success: false, error: 'Winner not found in players list' },
        { status: 400 }
      );
    }

    // Process rewards for winner
    const rewardResults: any = {
      flowReward: null,
      ensReward: null,
      errors: []
    };

    try {
      // 1. Flow NFT Reward for winner
      if (winner.address || winner.userId) {
        const winnerAddress = winner.address || winner.userId;
        
        console.log('🌊 Minting Flow NFT for winner:', winnerAddress);
        
        const nftMetadata = {
          name: `${unityResult.gameType} Champion`,
          description: `Winner of ${unityResult.gameType} game on ${unityResult.gameEndTime}`,
          gameType: unityResult.gameType,
          achievement: 'Winner',
          gameSessionId: unityResult.gameSessionId,
          winnerUsername: unityResult.winnerUsername,
          score: winner.score,
          totalRounds: unityResult.totalRounds,
          gameDuration: unityResult.gameDurationSeconds,
          timestamp: unityResult.gameEndTime
        };

        try {
          const nftResult = await flowService.rewardPlayerWithNFT(
            winnerAddress,
            unityResult.gameSessionId,
            nftMetadata
          );
          
          rewardResults.flowReward = {
            type: 'NFT',
            ...nftResult
          };
          
          console.log('✅ Flow NFT minted successfully');
        } catch (flowError) {
          console.error('❌ Flow NFT minting failed:', flowError);
          rewardResults.errors.push(`Flow NFT: ${flowError instanceof Error ? flowError.message : 'Unknown error'}`);
        }
      }

      // 2. ENS Badge for winner (if Ethereum address available)
      const winnerEthAddress = addressMappings[unityResult.winnerUserId]?.ethereumAddress || winner.address;
      
      if (winnerEthAddress && winnerEthAddress.startsWith('0x')) {
        console.log('🏷️ Minting ENS badge for winner:', winnerEthAddress);
        
        try {
          const ensBadge = await ensService.mintSubdomain({
            playerAddress: winnerEthAddress,
            gameSessionId: unityResult.gameSessionId,
            achievement: 'winner',
            subdomainPrefix: unityResult.gameType
          });
          
          rewardResults.ensReward = ensBadge;
          console.log('✅ ENS badge minted successfully');
        } catch (ensError) {
          console.error('❌ ENS badge minting failed:', ensError);
          rewardResults.errors.push(`ENS Badge: ${ensError instanceof Error ? ensError.message : 'Unknown error'}`);
        }
      } else {
        console.log('ℹ️ No Ethereum address for ENS badge, skipping');
      }

    } catch (error) {
      console.error('❌ Error processing rewards:', error);
      rewardResults.errors.push(`General: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 3. Log the game result and rewards
    try {
      await logger.logGameEvent('GAME_COMPLETED', {
        gameSessionId: unityResult.gameSessionId,
        gameType: unityResult.gameType,
        winner: {
          userId: unityResult.winnerUserId,
          username: unityResult.winnerUsername,
          score: winner.score
        },
        players: unityResult.players,
        rewards: rewardResults,
        gameDuration: unityResult.gameDurationSeconds,
        totalRounds: unityResult.totalRounds,
        endTime: unityResult.gameEndTime
      });
    } catch (logError) {
      console.error('❌ Failed to log game event:', logError);
    }

    // 4. Update player statistics (could be database update in production)
    try {
      // Update winner stats
      const profileResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/player/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: unityResult.winnerUserId,
          gameResult: {
            gameId: unityResult.gameSessionId,
            gameType: unityResult.gameType,
            result: 'win',
            score: winner.score,
            timestamp: new Date(unityResult.gameEndTime).getTime(),
            reward: rewardResults.flowReward || rewardResults.ensReward ? {
              type: rewardResults.flowReward ? 'nft' : 'badge',
              ...rewardResults.flowReward || rewardResults.ensReward
            } : undefined
          }
        })
      });

      if (!profileResponse.ok) {
        console.warn('⚠️ Failed to update winner profile');
      }
    } catch (profileError) {
      console.error('❌ Error updating player profile:', profileError);
    }

    // Return success response to Unity
    const response = {
      success: true,
      message: 'Game result processed successfully',
      gameSessionId: unityResult.gameSessionId,
      winner: {
        userId: unityResult.winnerUserId,
        username: unityResult.winnerUsername,
        rewards: {
          flowNFT: !!rewardResults.flowReward,
          ensBadge: !!rewardResults.ensReward,
          flowReward: rewardResults.flowReward,
          ensReward: rewardResults.ensReward
        }
      },
      processedAt: new Date().toISOString(),
      errors: rewardResults.errors.length > 0 ? rewardResults.errors : undefined
    };

    console.log('✅ Game result processed successfully:', response);
    
    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('❌ Failed to process game result:', error);
    
    // Log the error
    try {
      await logger.logGameEvent('GAME_PROCESSING_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.error('❌ Failed to log error:', logError);
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error processing game result',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing/debugging
export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/game-results',
    method: 'POST',
    description: 'Receives game results from Unity WebResultReporter',
    expectedFormat: {
      gameSessionId: 'string',
      winnerUserId: 'string (wallet address)',
      winnerUsername: 'string',
      players: 'array of player objects',
      rounds: 'array of round data',
      totalRounds: 'number',
      gameDurationSeconds: 'number',
      gameEndTime: 'ISO 8601 string',
      gameType: 'string'
    },
    status: 'ready'
  });
}

// PUT endpoint for updating address mappings
export async function PUT(request: NextRequest) {
  try {
    const { userId, flowAddress, ethereumAddress } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Update address mapping
    if (!addressMappings[userId]) {
      addressMappings[userId] = {};
    }
    
    if (flowAddress) {
      addressMappings[userId].flowAddress = flowAddress;
    }
    
    if (ethereumAddress) {
      addressMappings[userId].ethereumAddress = ethereumAddress;
    }

    console.log('📝 Address mapping updated:', { userId, flowAddress, ethereumAddress });
    
    return NextResponse.json({
      success: true,
      message: 'Address mapping updated',
      mapping: addressMappings[userId]
    });
    
  } catch (error) {
    console.error('❌ Error updating address mapping:', error);
    return NextResponse.json(
      { error: 'Failed to update address mapping' },
      { status: 500 }
    );
  }
}