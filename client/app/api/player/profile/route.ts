// API route for player profiles and stats
import { NextRequest, NextResponse } from 'next/server';
import { flowService } from '@/services/flow';
import { ensService } from '@/services/ens';

interface PlayerStats {
  totalGames: number;
  gamesWon: number;
  totalScore: number;
  averageScore: number;
  winRate: number;
  achievements: string[];
  nfts: any[];
  ensSubdomains: string[];
  flowBalance: number;
  lastGameAt: number;
  createdAt: number;
}

interface PlayerProfile {
  userId: string;
  flowAddress: string;
  ethereumAddress: string;
  stats: PlayerStats;
  rewards: any[];
  gameHistory: any[];
}

// In-memory storage for player data (use database in production)
const playerProfiles: Record<string, PlayerProfile> = {};
const playerGameHistory: Record<string, any[]> = {};

// GET player profile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const flowAddress = searchParams.get('flowAddress');
    const ethereumAddress = searchParams.get('ethereumAddress');

    if (!userId && !flowAddress && !ethereumAddress) {
      return NextResponse.json(
        { error: 'Missing identifier (userId, flowAddress, or ethereumAddress)' },
        { status: 400 }
      );
    }

    // Find player by any identifier
    let profile = null;
    if (userId) {
      profile = playerProfiles[userId];
    } else {
      // Search by address
      profile = Object.values(playerProfiles).find(
        p => p.flowAddress === flowAddress || p.ethereumAddress === ethereumAddress
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Player profile not found' },
        { status: 404 }
      );
    }

    // Fetch fresh data from blockchain
    try {
      // Get Flow player data
      const flowPlayerData = await flowService.getPlayerProfile(profile.flowAddress);
      if (flowPlayerData) {
        profile.stats.totalGames = flowPlayerData.totalGamesWon || profile.stats.totalGames;
        profile.stats.gamesWon = flowPlayerData.totalGamesWon || profile.stats.gamesWon;
        profile.stats.flowBalance = await flowService.getAccountBalance(profile.flowAddress);
        profile.stats.nfts = await flowService.getPlayerNFTs(profile.flowAddress);
      }

      // Get ENS subdomains
      profile.stats.ensSubdomains = ensService.getMintedSubdomains().filter(domain =>
        domain.toLowerCase().includes(profile!.ethereumAddress.toLowerCase().slice(-6))
      );

    } catch (error) {
      console.warn('⚠️ Failed to fetch fresh blockchain data:', error);
    }

    return NextResponse.json({
      success: true,
      profile,
    });

  } catch (error) {
    console.error('❌ Failed to get player profile:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create/update player profile
export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      flowAddress,
      ethereumAddress,
      gameResult,
      updateType = 'game_result'
    } = await request.json();

    if (!userId || !flowAddress || !ethereumAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get or create player profile
    let profile = playerProfiles[userId];
    if (!profile) {
      profile = {
        userId,
        flowAddress,
        ethereumAddress,
        stats: {
          totalGames: 0,
          gamesWon: 0,
          totalScore: 0,
          averageScore: 0,
          winRate: 0,
          achievements: [],
          nfts: [],
          ensSubdomains: [],
          flowBalance: 0,
          lastGameAt: 0,
          createdAt: Date.now(),
        },
        rewards: [],
        gameHistory: [],
      };
      playerProfiles[userId] = profile;
      playerGameHistory[userId] = [];
    }

    // Update profile based on type
    if (updateType === 'game_result' && gameResult) {
      await updatePlayerWithGameResult(profile, gameResult);
    }

    // Save game to history
    if (gameResult) {
      const gameHistoryEntry = {
        gameSessionId: gameResult.gameSessionId,
        gameType: gameResult.gameType,
        isWinner: gameResult.winnerId === userId,
        score: gameResult.playerList.find((p: any) => p.id === userId)?.score || 0,
        rank: gameResult.playerList.find((p: any) => p.id === userId)?.rank || 0,
        duration: gameResult.gameStats.duration,
        timestamp: Date.now(),
      };

      playerGameHistory[userId] = playerGameHistory[userId] || [];
      playerGameHistory[userId].push(gameHistoryEntry);
      profile.gameHistory = playerGameHistory[userId].slice(-50); // Keep last 50 games
    }

    return NextResponse.json({
      success: true,
      profile,
    });

  } catch (error) {
    console.error('❌ Failed to update player profile:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update player stats with game result
async function updatePlayerWithGameResult(profile: PlayerProfile, gameResult: any) {
  const player = gameResult.playerList.find((p: any) => p.id === profile.userId);
  if (!player) return;

  // Update basic stats
  profile.stats.totalGames += 1;
  profile.stats.totalScore += player.score;
  profile.stats.averageScore = profile.stats.totalScore / profile.stats.totalGames;

  if (gameResult.winnerId === profile.userId) {
    profile.stats.gamesWon += 1;
  }

  profile.stats.winRate = (profile.stats.gamesWon / profile.stats.totalGames) * 100;
  profile.stats.lastGameAt = Date.now();

  // Add achievement if present
  if (gameResult.achievement && !profile.stats.achievements.includes(gameResult.achievement)) {
    profile.stats.achievements.push(gameResult.achievement);
  }

  // Refresh blockchain data
  try {
    profile.stats.flowBalance = await flowService.getAccountBalance(profile.flowAddress);
    profile.stats.nfts = await flowService.getPlayerNFTs(profile.flowAddress);
  } catch (error) {
    console.warn('⚠️ Failed to refresh blockchain data:', error);
  }
}

// GET leaderboard
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'gamesWon';
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get all profiles and sort
    const allProfiles = Object.values(playerProfiles);
    
    allProfiles.sort((a, b) => {
      switch (sortBy) {
        case 'gamesWon':
          return b.stats.gamesWon - a.stats.gamesWon;
        case 'winRate':
          return b.stats.winRate - a.stats.winRate;
        case 'averageScore':
          return b.stats.averageScore - a.stats.averageScore;
        case 'totalScore':
          return b.stats.totalScore - a.stats.totalScore;
        default:
          return b.stats.gamesWon - a.stats.gamesWon;
      }
    });

    const leaderboard = allProfiles.slice(0, limit).map((profile, index) => ({
      rank: index + 1,
      userId: profile.userId,
      flowAddress: profile.flowAddress,
      stats: profile.stats,
    }));

    return NextResponse.json({
      success: true,
      leaderboard,
      total: allProfiles.length,
    });

  } catch (error) {
    console.error('❌ Failed to get leaderboard:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE player profile (for testing/admin)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    delete playerProfiles[userId];
    delete playerGameHistory[userId];

    return NextResponse.json({
      success: true,
      message: 'Player profile deleted',
    });

  } catch (error) {
    console.error('❌ Failed to delete player profile:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}