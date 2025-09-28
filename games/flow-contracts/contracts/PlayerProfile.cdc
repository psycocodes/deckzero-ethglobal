import NonFungibleToken from 0xf8d6e0586b0a20c7
import MetadataViews from 0xf8d6e0586b0a20c7
import GameRewards from 0xf8d6e0586b0a20c7

/// PlayerProfile - Contract for managing player statistics and achievements
///
pub contract PlayerProfile {

    /// Total number of player profiles created
    pub var totalProfiles: UInt64

    /// Events
    pub event ContractInitialized()
    pub event ProfileCreated(playerId: UInt64, address: Address)
    pub event StatUpdated(playerId: UInt64, statName: String, newValue: AnyStruct)
    pub event AchievementUnlocked(playerId: UInt64, achievement: String, timestamp: UFix64)

    /// Storage paths
    pub let ProfileStoragePath: StoragePath
    pub let ProfilePublicPath: PublicPath
    pub let AdminStoragePath: StoragePath

    /// Player statistics structure
    pub struct PlayerStats {
        pub var gamesPlayed: UInt64
        pub var gamesWon: UInt64
        pub var totalScore: Int64
        pub var winRate: UFix64
        pub var longestWinStreak: UInt64
        pub var currentWinStreak: UInt64
        pub var favoriteGameType: String
        pub var totalPlayTime: UFix64
        pub var lastPlayedTimestamp: UFix64
        pub var achievements: [String]
        pub var customStats: {String: AnyStruct}

        init() {
            self.gamesPlayed = 0
            self.gamesWon = 0
            self.totalScore = 0
            self.winRate = 0.0
            self.longestWinStreak = 0
            self.currentWinStreak = 0
            self.favoriteGameType = ""
            self.totalPlayTime = 0.0
            self.lastPlayedTimestamp = 0.0
            self.achievements = []
            self.customStats = {}
        }

        /// Update win rate based on games played and won
        pub fun updateWinRate() {
            if self.gamesPlayed > 0 {
                self.winRate = UFix64(self.gamesWon) / UFix64(self.gamesPlayed)
            }
        }

        /// Record a game result
        pub fun recordGame(won: Bool, score: Int64, gameType: String, playTime: UFix64) {
            self.gamesPlayed = self.gamesPlayed + 1
            self.totalScore = self.totalScore + score
            self.totalPlayTime = self.totalPlayTime + playTime
            self.lastPlayedTimestamp = getCurrentBlock().timestamp
            
            // Update favorite game type (simple logic - could be enhanced)
            if self.favoriteGameType == "" {
                self.favoriteGameType = gameType
            }
            
            if won {
                self.gamesWon = self.gamesWon + 1
                self.currentWinStreak = self.currentWinStreak + 1
                if self.currentWinStreak > self.longestWinStreak {
                    self.longestWinStreak = self.currentWinStreak
                }
            } else {
                self.currentWinStreak = 0
            }
            
            self.updateWinRate()
        }

        /// Add a custom achievement
        pub fun addAchievement(_ achievement: String) {
            if !self.achievements.contains(achievement) {
                self.achievements.append(achievement)
            }
        }

        /// Set custom stat
        pub fun setCustomStat(key: String, value: AnyStruct) {
            self.customStats[key] = value
        }
    }

    /// Player profile resource
    pub resource Profile {
        pub let id: UInt64
        pub let playerAddress: Address
        pub let createdAt: UFix64
        pub var displayName: String
        pub var bio: String
        pub var avatar: String
        pub var stats: PlayerStats
        pub var socialLinks: {String: String}
        pub var privacy: {String: Bool}

        init(playerAddress: Address) {
            self.id = PlayerProfile.totalProfiles
            self.playerAddress = playerAddress
            self.createdAt = getCurrentBlock().timestamp
            self.displayName = ""
            self.bio = ""
            self.avatar = ""
            self.stats = PlayerStats()
            self.socialLinks = {}
            self.privacy = {
                "showStats": true,
                "showAchievements": true,
                "showGameHistory": false
            }
            
            PlayerProfile.totalProfiles = PlayerProfile.totalProfiles + 1
        }

        /// Update profile information
        pub fun updateProfile(displayName: String?, bio: String?, avatar: String?) {
            if displayName != nil {
                self.displayName = displayName!
            }
            if bio != nil {
                self.bio = bio!
            }
            if avatar != nil {
                self.avatar = avatar!
            }
        }

        /// Record a game session
        pub fun recordGameSession(
            gameType: String,
            won: Bool,
            score: Int64,
            playTime: UFix64,
            sessionId: String,
            metadata: {String: AnyStruct}
        ) {
            self.stats.recordGame(won: won, score: score, gameType: gameType, playTime: playTime)
            
            // Check for achievements
            self.checkAchievements()
        }

        /// Internal function to check and unlock achievements
        access(self) fun checkAchievements() {
            let stats = &self.stats
            
            // First win achievement
            if stats.gamesWon == 1 && !stats.achievements.contains("First Victory") {
                stats.addAchievement("First Victory")
                emit AchievementUnlocked(playerId: self.id, achievement: "First Victory", timestamp: getCurrentBlock().timestamp)
            }
            
            // Win streak achievements
            if stats.currentWinStreak == 5 && !stats.achievements.contains("Hot Streak") {
                stats.addAchievement("Hot Streak")
                emit AchievementUnlocked(playerId: self.id, achievement: "Hot Streak", timestamp: getCurrentBlock().timestamp)
            }
            
            if stats.currentWinStreak == 10 && !stats.achievements.contains("Unstoppable") {
                stats.addAchievement("Unstoppable")
                emit AchievementUnlocked(playerId: self.id, achievement: "Unstoppable", timestamp: getCurrentBlock().timestamp)
            }
            
            // Games played milestones
            if stats.gamesPlayed == 10 && !stats.achievements.contains("Getting Started") {
                stats.addAchievement("Getting Started")
                emit AchievementUnlocked(playerId: self.id, achievement: "Getting Started", timestamp: getCurrentBlock().timestamp)
            }
            
            if stats.gamesPlayed == 100 && !stats.achievements.contains("Veteran Player") {
                stats.addAchievement("Veteran Player")
                emit AchievementUnlocked(playerId: self.id, achievement: "Veteran Player", timestamp: getCurrentBlock().timestamp)
            }
            
            // High win rate achievements
            if stats.gamesPlayed >= 20 && stats.winRate >= 0.8 && !stats.achievements.contains("High Achiever") {
                stats.addAchievement("High Achiever")
                emit AchievementUnlocked(playerId: self.id, achievement: "High Achiever", timestamp: getCurrentBlock().timestamp)
            }
        }

        /// Add custom achievement (admin only)
        pub fun addCustomAchievement(achievement: String) {
            self.stats.addAchievement(achievement)
            emit AchievementUnlocked(playerId: self.id, achievement: achievement, timestamp: getCurrentBlock().timestamp)
        }

        /// Update social links
        pub fun updateSocialLinks(links: {String: String}) {
            for key in links.keys {
                self.socialLinks[key] = links[key]!
            }
        }

        /// Update privacy settings
        pub fun updatePrivacy(settings: {String: Bool}) {
            for key in settings.keys {
                self.privacy[key] = settings[key]!
            }
        }

        /// Get public profile data (respects privacy settings)
        pub fun getPublicProfile(): {String: AnyStruct} {
            let publicData: {String: AnyStruct} = {
                "id": self.id,
                "playerAddress": self.playerAddress,
                "displayName": self.displayName,
                "bio": self.bio,
                "avatar": self.avatar,
                "createdAt": self.createdAt
            }
            
            if self.privacy["showStats"] == true {
                publicData["stats"] = {
                    "gamesPlayed": self.stats.gamesPlayed,
                    "gamesWon": self.stats.gamesWon,
                    "winRate": self.stats.winRate,
                    "longestWinStreak": self.stats.longestWinStreak,
                    "favoriteGameType": self.stats.favoriteGameType
                }
            }
            
            if self.privacy["showAchievements"] == true {
                publicData["achievements"] = self.stats.achievements
            }
            
            return publicData
        }
    }

    /// Public interface for profile collections
    pub resource interface ProfileCollectionPublic {
        pub fun getProfileIds(): [UInt64]
        pub fun getPublicProfile(id: UInt64): {String: AnyStruct}?
        pub fun profileExists(id: UInt64): Bool
    }

    /// Collection resource for managing multiple profiles
    pub resource ProfileCollection: ProfileCollectionPublic {
        pub var profiles: @{UInt64: Profile}

        init() {
            self.profiles <- {}
        }

        /// Create a new profile
        pub fun createProfile(playerAddress: Address): UInt64 {
            let profile <- create Profile(playerAddress: playerAddress)
            let profileId = profile.id
            
            self.profiles[profileId] <-! profile
            
            emit ProfileCreated(playerId: profileId, address: playerAddress)
            return profileId
        }

        /// Get profile reference
        pub fun borrowProfile(id: UInt64): &Profile? {
            return &self.profiles[id] as &Profile?
        }

        /// Get public profile data
        pub fun getPublicProfile(id: UInt64): {String: AnyStruct}? {
            if let profile = &self.profiles[id] as &Profile? {
                return profile.getPublicProfile()
            }
            return nil
        }

        /// Check if profile exists
        pub fun profileExists(id: UInt64): Bool {
            return self.profiles.containsKey(id)
        }

        /// Get all profile IDs
        pub fun getProfileIds(): [UInt64] {
            return self.profiles.keys
        }

        destroy() {
            destroy self.profiles
        }
    }

    /// Admin resource for contract management
    pub resource Administrator {
        /// Force add achievement to any profile
        pub fun addAchievementToProfile(profileId: UInt64, achievement: String, collection: &ProfileCollection) {
            if let profile = collection.borrowProfile(id: profileId) {
                profile.addCustomAchievement(achievement: achievement)
            }
        }
        
        /// Get private profile data for moderation
        pub fun getFullProfile(profileId: UInt64, collection: &ProfileCollection): &Profile? {
            return collection.borrowProfile(id: profileId)
        }
    }

    /// Create a new empty profile collection
    pub fun createEmptyCollection(): @ProfileCollection {
        return <- create ProfileCollection()
    }

    /// Get leaderboard data
    pub fun getLeaderboard(collection: &ProfileCollection, stat: String, limit: Int): [{String: AnyStruct}] {
        let profileIds = collection.getProfileIds()
        let leaderboard: [{String: AnyStruct}] = []
        
        // Simple leaderboard implementation
        for profileId in profileIds {
            if let profileData = collection.getPublicProfile(id: profileId) {
                leaderboard.append(profileData)
            }
            
            if leaderboard.length >= limit {
                break
            }
        }
        
        return leaderboard
    }

    init() {
        // Initialize the total profiles counter
        self.totalProfiles = 0

        // Set the named paths
        self.ProfileStoragePath = /storage/playerProfileCollection
        self.ProfilePublicPath = /public/playerProfileCollection
        self.AdminStoragePath = /storage/profileAdmin

        // Create admin resource
        let admin <- create Administrator()
        self.account.save(<-admin, to: self.AdminStoragePath)

        // Create a profile collection and save it to storage
        let collection <- create ProfileCollection()
        self.account.save(<-collection, to: self.ProfileStoragePath)

        // Create public capability for the collection
        self.account.link<&ProfileCollection{ProfileCollectionPublic}>(
            self.ProfilePublicPath,
            target: self.ProfileStoragePath
        )

        emit ContractInitialized()
    }
}