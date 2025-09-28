"use client";
import React, { useState, useEffect } from "react";
import { 
  User, 
  Trophy, 
  Coins, 
  Gift, 
  ExternalLink, 
  ChevronRight,
  Calendar,
  TrendingUp,
  Crown,
  Award,
  Zap,
  Globe
} from "lucide-react";

// Services
import { flowService } from "@/services/flow";
import { ensService } from "@/services/ens";
import { web3AuthService } from "@/services/web3auth";

interface PlayerProfile {
  userId: string;
  address: string;
  flowAddress?: string;
  ethereumAddress?: string;
  name?: string;
  email?: string;
  profileImage?: string;
  createdAt: number;
  lastActive: number;
}

interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  averageScore: number;
  winRate: number;
  flowTokensEarned: number;
  nftsCollected: number;
  ensSubdomains: string[];
  achievements: string[];
  gameHistory: Array<{
    gameId: string;
    gameType: string;
    timestamp: number;
    result: 'win' | 'lose';
    score: number;
    reward?: {
      type: 'nft' | 'tokens';
      amount?: number;
      tokenType?: string;
      nftId?: string;
    };
  }>;
  rank: number;
  level: number;
  experiencePoints: number;
}

interface NFT {
  id: string;
  name: string;
  description: string;
  image: string;
  collection: string;
  rarity: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
  earnedAt: number;
  gameId?: string;
}

export default function PlayerDashboard() {
  // State management
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [leaderboard, setLeaderboard] = useState<Array<{
    rank: number;
    userId: string;
    name: string;
    score: number;
    gamesWon: number;
  }>>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'nfts' | 'history' | 'leaderboard'>('overview');
  const [flowBalance, setFlowBalance] = useState<number>(0);
  const [ensSubdomains, setEnsSubdomains] = useState<string[]>([]);

  // Load player data on component mount
  useEffect(() => {
    loadPlayerData();
  }, []);

  const loadPlayerData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is authenticated
      if (!web3AuthService.isAuthenticated()) {
        setError("Please log in to view your dashboard");
        setLoading(false);
        return;
      }

      const user = web3AuthService.getCurrentUser();
      if (!user) {
        setError("Unable to load user profile");
        setLoading(false);
        return;
      }

      console.log("📊 Loading dashboard for user:", user.userId);

      // Load player profile and stats from API
      const [profileResponse, leaderboardResponse] = await Promise.all([
        fetch(`/api/player/profile?userId=${user.userId}`),
        fetch('/api/player/profile', { method: 'PUT' })
      ]);

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setProfile(profileData.profile);
        setStats(profileData.stats);
        
        console.log("✅ Player data loaded:", profileData);

        // Load blockchain data
        await loadBlockchainData(user);
      } else {
        console.error("❌ Failed to load profile data");
        setError("Failed to load player data");
      }

      if (leaderboardResponse.ok) {
        const leaderboardData = await leaderboardResponse.json();
        setLeaderboard(leaderboardData.leaderboard || []);
      }

    } catch (error) {
      console.error("❌ Dashboard loading error:", error);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const loadBlockchainData = async (user: any) => {
    try {
      // Load Flow balance if user has Flow address
      if (user.flowAddress) {
        try {
          const profile = await flowService.getPlayerProfile(user.flowAddress);
          if (profile) {
            // Set balance to 0 for now, as FlowPlayer type doesn't include balance
            setFlowBalance(0);
            console.log("🌊 Flow profile loaded:", profile);
          }
        } catch (error) {
          console.warn("⚠️ Failed to load Flow profile:", error);
        }
      }

      // Load ENS subdomains
      try {
        // Check if user has any ENS subdomains from stats
        if (stats?.ensSubdomains) {
          setEnsSubdomains(stats.ensSubdomains);
          console.log("🏷️ ENS subdomains loaded:", stats.ensSubdomains);
        }
      } catch (error) {
        console.warn("⚠️ Failed to load ENS subdomains:", error);
      }

      // Load NFT collection (mock data for now)
      const mockNFTs: NFT[] = [
        {
          id: "nft_001",
          name: "Beauty Contest Winner",
          description: "Awarded for winning the Beauty Contest game",
          image: "/assets/joker_card_v1.png",
          collection: "DeckZero Champions",
          rarity: "Rare",
          attributes: [
            { trait_type: "Game", value: "Beauty Contest" },
            { trait_type: "Difficulty", value: "Expert" },
            { trait_type: "Achievement", value: "First Place" }
          ],
          earnedAt: Date.now() - 86400000,
          gameId: "beauty-contest"
        }
      ];
      setNfts(mockNFTs);

    } catch (error) {
      console.error("❌ Failed to load blockchain data:", error);
    }
  };

  const formatAddress = (address: string | undefined) => {
    if (!address) return "Not connected";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary': return 'text-yellow-500';
      case 'epic': return 'text-purple-500';
      case 'rare': return 'text-blue-500';
      case 'uncommon': return 'text-green-500';
      default: return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto"></div>
          <p className="text-xl">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white space-y-4">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold">Dashboard Error</h2>
          <p className="text-lg">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition-all"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                {profile?.profileImage ? (
                  <img 
                    src={profile.profileImage} 
                    alt="Profile" 
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <User size={32} />
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{profile?.name || 'Player Dashboard'}</h1>
                <p className="text-blue-300">Level {stats?.level || 1} • Rank #{stats?.rank || '?'}</p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-gray-300 mb-1">Flow Balance</div>
              <div className="text-2xl font-bold text-blue-400">{flowBalance.toFixed(2)} FLOW</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Games Played</p>
                <p className="text-2xl font-bold">{stats?.gamesPlayed || 0}</p>
              </div>
              <Trophy className="text-yellow-500" size={32} />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Win Rate</p>
                <p className="text-2xl font-bold">{((stats?.winRate || 0) * 100).toFixed(1)}%</p>
              </div>
              <TrendingUp className="text-green-500" size={32} />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">NFTs Collected</p>
                <p className="text-2xl font-bold">{nfts.length}</p>
              </div>
              <Gift className="text-purple-500" size={32} />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">ENS Badges</p>
                <p className="text-2xl font-bold">{ensSubdomains.length}</p>
              </div>
              <Award className="text-blue-500" size={32} />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 mb-6">
          <div className="flex">
            {[
              { key: 'overview', label: 'Overview', icon: User },
              { key: 'nfts', label: 'NFT Collection', icon: Gift },
              { key: 'history', label: 'Game History', icon: Calendar },
              { key: 'leaderboard', label: 'Leaderboard', icon: Crown }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex-1 flex items-center justify-center space-x-2 p-4 transition-all ${
                  activeTab === key 
                    ? 'bg-blue-600/50 border-b-2 border-blue-400' 
                    : 'hover:bg-white/5'
                }`}
              >
                <Icon size={20} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-4">Account Overview</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Wallet Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Flow Address:</span>
                      <span className="font-mono">{formatAddress(profile?.flowAddress)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Ethereum Address:</span>
                      <span className="font-mono">{formatAddress(profile?.ethereumAddress)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Member Since:</span>
                      <span>{profile?.createdAt ? formatDate(profile.createdAt) : 'Unknown'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Achievements</h3>
                  <div className="space-y-2">
                    {stats?.achievements?.length ? stats.achievements.map((achievement, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Zap className="text-yellow-500" size={16} />
                        <span>{achievement}</span>
                      </div>
                    )) : (
                      <p className="text-gray-400">No achievements yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'nfts' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">NFT Collection</h2>
              {nfts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {nfts.map((nft) => (
                    <div key={nft.id} className="bg-white/5 rounded-xl overflow-hidden border border-white/10">
                      <img 
                        src={nft.image} 
                        alt={nft.name}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-4">
                        <h3 className="font-bold text-lg mb-2">{nft.name}</h3>
                        <p className="text-gray-300 text-sm mb-3">{nft.description}</p>
                        <div className="flex justify-between items-center">
                          <span className={`text-sm font-medium ${getRarityColor(nft.rarity)}`}>
                            {nft.rarity}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(nft.earnedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Gift className="mx-auto text-gray-400 mb-4" size={64} />
                  <h3 className="text-xl font-semibold mb-2">No NFTs Yet</h3>
                  <p className="text-gray-400">Win games to earn exclusive NFTs!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Game History</h2>
              {stats?.gameHistory?.length ? (
                <div className="space-y-3">
                  {stats.gameHistory.slice(0, 10).map((game, index) => (
                    <div key={index} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${
                          game.result === 'win' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <div>
                          <div className="font-medium">{game.gameType}</div>
                          <div className="text-sm text-gray-400">{formatDate(game.timestamp)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{game.score} pts</div>
                        {game.reward && (
                          <div className="text-sm text-blue-400">
                            +{game.reward.type === 'tokens' ? `${game.reward.amount} ${game.reward.tokenType}` : 'NFT'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="mx-auto text-gray-400 mb-4" size={64} />
                  <h3 className="text-xl font-semibold mb-2">No Games Played</h3>
                  <p className="text-gray-400">Start playing to build your history!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Global Leaderboard</h2>
              <div className="space-y-2">
                {leaderboard.map((player, index) => (
                  <div 
                    key={player.userId}
                    className={`p-4 rounded-lg flex items-center justify-between ${
                      player.userId === profile?.userId 
                        ? 'bg-blue-600/30 border border-blue-500' 
                        : 'bg-white/5'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        player.rank === 1 ? 'bg-yellow-500 text-black' :
                        player.rank === 2 ? 'bg-gray-300 text-black' :
                        player.rank === 3 ? 'bg-amber-600 text-white' :
                        'bg-gray-600'
                      }`}>
                        {player.rank}
                      </div>
                      <div>
                        <div className="font-medium">{player.name || `Player ${player.userId.slice(0, 8)}`}</div>
                        <div className="text-sm text-gray-400">{player.gamesWon} wins</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{player.score.toLocaleString()}</div>
                      <div className="text-sm text-gray-400">points</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}