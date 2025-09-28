// API route for receiving game results from Unity
import { NextRequest, NextResponse } from 'next/server';
import { flowService } from '@/services/flow';
import { ensService } from '@/services/ens';

interface GameResultData {
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

interface AddressMapping {
  flowAddress: string;
  ethereumAddress: string;
}

// In-memory address mappings (in production, use a database)
const addressMappings: Record<string, AddressMapping> = {};

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const gameResult: GameResultData = await request.json();
    
    // Validate required fields
    if (!gameResult.gameSessionId || !gameResult.winnerId || !gameResult.playerList) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('🎮 Game result received:', {
      sessionId: gameResult.gameSessionId,
      winnerId: gameResult.winnerId,
      playerCount: gameResult.playerList.length,
    });

    // Find winner in player list
    const winner = gameResult.playerList.find(player => player.id === gameResult.winnerId);
    if (!winner) {
      return NextResponse.json(
        { error: 'Winner not found in player list' },
        { status: 400 }
      );
    }

    // Get address mapping for winner
    const addressMapping = addressMappings[winner.id] || addressMappings[winner.address];
    if (!addressMapping) {
      console.warn(`⚠️ No address mapping found for winner ${winner.id}`);
      
      // Still process the game result, but skip blockchain rewards
      return NextResponse.json({
        success: true,
        message: 'Game result processed, but no blockchain rewards (no address mapping)',
        gameSessionId: gameResult.gameSessionId,
        winnerId: gameResult.winnerId,
        flowReward: null,
        ensReward: null,
      });
    }

    console.log('🎯 Processing rewards for winner:', {
      winnerId: winner.id,
      flowAddress: addressMapping.flowAddress,
      ethereumAddress: addressMapping.ethereumAddress,
    });

    // Process Flow reward
    let flowReward = null;
    try {
      flowReward = await processFlowReward(
        addressMapping.flowAddress,
        gameResult
      );
    } catch (error) {
      console.error('❌ Failed to process Flow reward:', error);
    }

    // Process ENS reward
    let ensReward = null;
    try {
      ensReward = await processENSReward(
        addressMapping.ethereumAddress,
        gameResult
      );
    } catch (error) {
      console.error('❌ Failed to process ENS reward:', error);
    }

    // Schedule Flow Actions for automation (optional)
    let scheduledActions = null;
    try {
      scheduledActions = await scheduleFlowActions(gameResult, addressMapping);
    } catch (error) {
      console.error('❌ Failed to schedule Flow actions:', error);
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Game result processed successfully',
      gameSessionId: gameResult.gameSessionId,
      winnerId: gameResult.winnerId,
      flowReward,
      ensReward,
      scheduledActions,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to process game result:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Process Flow blockchain reward
async function processFlowReward(
  flowAddress: string,
  gameResult: GameResultData
): Promise<any> {
  try {
    console.log('🌊 Processing Flow reward for:', flowAddress);

    // Determine reward type based on game result
    const rewardType = determineRewardType(gameResult);
    
    let flowTransaction = null;

    switch (rewardType) {
      case 'nft':
        // Mint NFT reward
        const nftMetadata = {
          name: `${gameResult.gameType} Winner`,
          description: `Winner of game session ${gameResult.gameSessionId}`,
          image: 'https://deckzero.app/nft-winner.png',
          attributes: [
            { trait_type: 'Game Type', value: gameResult.gameType },
            { trait_type: 'Session ID', value: gameResult.gameSessionId },
            { trait_type: 'Achievement', value: gameResult.achievement || 'Winner' },
            { trait_type: 'Score', value: gameResult.playerList.find(p => p.address === flowAddress)?.score?.toString() || '0' },
          ],
        };

        flowTransaction = await flowService.rewardPlayerWithNFT(
          flowAddress,
          gameResult.gameSessionId,
          nftMetadata
        );
        break;

      case 'token':
        // Reward with tokens
        const tokenAmount = calculateTokenReward(gameResult);
        flowTransaction = await flowService.rewardPlayerWithTokens(
          flowAddress,
          tokenAmount,
          gameResult.gameSessionId
        );
        break;

      default:
        console.warn('⚠️ Unknown reward type, skipping Flow reward');
    }

    return {
      type: rewardType,
      transactionId: flowTransaction?.id,
      status: flowTransaction?.status,
      address: flowAddress,
      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error('❌ Flow reward processing failed:', error);
    throw error;
  }
}

// Process ENS subdomain reward
async function processENSReward(
  ethereumAddress: string,
  gameResult: GameResultData
): Promise<any> {
  try {
    console.log('🏷️ Processing ENS reward for:', ethereumAddress);

    // Initialize ENS service if not already done
    if (!ensService.isWalletConnected()) {
      await ensService.initialize();
      await ensService.connectWallet();
    }

    // Mint ENS subdomain
    const ensSubdomain = await ensService.mintSubdomain({
      playerAddress: ethereumAddress,
      gameSessionId: gameResult.gameSessionId,
      achievement: gameResult.achievement || 'winner',
    });

    return {
      subdomain: ensSubdomain.subdomain,
      fullDomain: ensSubdomain.fullDomain,
      transactionHash: ensSubdomain.transactionHash,
      owner: ensSubdomain.owner,
      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error('❌ ENS reward processing failed:', error);
    throw error;
  }
}

// Schedule Flow Actions for automation
async function scheduleFlowActions(
  gameResult: GameResultData,
  addressMapping: AddressMapping
): Promise<any> {
  try {
    console.log('📅 Scheduling Flow Actions for automation');

    const actions = [];

    // Schedule recurring rewards for consistent players
    const recurringRewardAction = await flowService.scheduleRewardAction(
      `player_${addressMapping.flowAddress}_consecutive_wins >= 3`,
      {
        playerId: gameResult.winnerId,
        gameSessionId: gameResult.gameSessionId,
        rewardType: 'token',
        amount: 100,
      }
    );
    actions.push(recurringRewardAction);

    // Schedule achievement unlock
    if (gameResult.achievement) {
      const achievementAction = await flowService.scheduleRewardAction(
        `achievement_${gameResult.achievement}_unlocked`,
        {
          playerId: gameResult.winnerId,
          gameSessionId: gameResult.gameSessionId,
          rewardType: 'nft',
          metadata: { achievement: gameResult.achievement },
        }
      );
      actions.push(achievementAction);
    }

    return {
      scheduledActions: actions,
      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error('❌ Failed to schedule Flow actions:', error);
    throw error;
  }
}

// Determine reward type based on game result
function determineRewardType(gameResult: GameResultData): 'nft' | 'token' | 'badge' {
  // Logic to determine reward type based on game performance
  if (gameResult.achievement) {
    return 'nft'; // Special achievement gets NFT
  }
  
  const winner = gameResult.playerList.find(p => p.id === gameResult.winnerId);
  if (winner && winner.score > 100) {
    return 'nft'; // High score gets NFT
  }
  
  return 'token'; // Default token reward
}

// Calculate token reward amount
function calculateTokenReward(gameResult: GameResultData): number {
  const winner = gameResult.playerList.find(p => p.id === gameResult.winnerId);
  if (!winner) return 10; // Default reward
  
  // Base reward + bonus based on score and game duration
  let reward = 10;
  reward += Math.floor(winner.score / 10); // Score bonus
  reward += Math.floor((gameResult.gameStats.duration || 0) / 60000); // Time bonus
  
  return Math.min(reward, 100); // Cap at 100 tokens
}

// Helper endpoint to add address mappings (for testing/admin)
export async function PUT(request: NextRequest) {
  try {
    const { userId, flowAddress, ethereumAddress } = await request.json();
    
    if (!userId || !flowAddress || !ethereumAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Store address mapping
    addressMappings[userId] = { flowAddress, ethereumAddress };
    
    console.log('✅ Address mapping added:', { userId, flowAddress, ethereumAddress });
    
    return NextResponse.json({
      success: true,
      message: 'Address mapping added successfully',
      userId,
      flowAddress,
      ethereumAddress,
    });

  } catch (error) {
    console.error('❌ Failed to add address mapping:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get address mappings (for debugging)
export async function GET() {
  return NextResponse.json({
    mappings: addressMappings,
    count: Object.keys(addressMappings).length,
  });
}