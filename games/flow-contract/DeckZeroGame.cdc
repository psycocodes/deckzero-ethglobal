// Flow Contract for DeckZero Game
// This contract handles game logic on Flow blockchain and emits PlayerWon events

access(all) contract DeckZeroGame {
    
    // Events
    access(all) event PlayerWon(gameId: UInt64, winner: Address, prize: UFix64, timestamp: UFix64)
    access(all) event GameCreated(gameId: UInt64, creator: Address, entryFee: UFix64, maxPlayers: UInt8)
    access(all) event PlayerJoined(gameId: UInt64, player: Address)
    access(all) event GameEnded(gameId: UInt64, totalPrize: UFix64)
    
    // Game states
    access(all) enum GameState: UInt8 {
        access(all) case Created
        access(all) case InProgress  
        access(all) case Ended
    }
    
    // Player data
    access(all) struct Player {
        access(all) let address: Address
        access(all) var score: Int256
        access(all) var isEliminated: Bool
        
        init(address: Address) {
            self.address = address
            self.score = 0
            self.isEliminated = false
        }
    }
    
    // Game data
    access(all) struct Game {
        access(all) let gameId: UInt64
        access(all) let creator: Address
        access(all) let entryFee: UFix64
        access(all) let maxPlayers: UInt8
        access(all) var state: GameState
        access(all) var players: [Address]
        access(all) var playerData: {Address: Player}
        access(all) var currentRound: UInt64
        access(all) var totalPrize: UFix64
        
        init(gameId: UInt64, creator: Address, entryFee: UFix64, maxPlayers: UInt8) {
            self.gameId = gameId
            self.creator = creator
            self.entryFee = entryFee
            self.maxPlayers = maxPlayers
            self.state = GameState.Created
            self.players = []
            self.playerData = {}
            self.currentRound = 0
            self.totalPrize = 0.0
        }
    }
    
    // Storage
    access(all) var games: {UInt64: Game}
    access(all) var nextGameId: UInt64
    access(all) var totalGamesCreated: UInt64
    
    // Admin resource for game management
    access(all) resource Admin {
        
        // End game and declare winner
        access(all) fun endGame(gameId: UInt64, winner: Address) {
            pre {
                DeckZeroGame.games[gameId] != nil: "Game does not exist"
                DeckZeroGame.games[gameId]!.state == GameState.InProgress: "Game is not in progress"
                DeckZeroGame.games[gameId]!.playerData[winner] != nil: "Winner is not a player in this game"
            }
            
            let game = &DeckZeroGame.games[gameId]! as &Game
            game.state = GameState.Ended
            
            // Calculate winner's prize (total entry fees)
            let prize = game.totalPrize
            
            // Emit PlayerWon event for bridge monitoring
            emit PlayerWon(
                gameId: gameId, 
                winner: winner, 
                prize: prize, 
                timestamp: getCurrentBlock().timestamp
            )
            
            emit GameEnded(gameId: gameId, totalPrize: prize)
            
            // In a real implementation, you would transfer the prize to the winner
            // This would involve handling Flow tokens (FLOW or USDC)
        }
        
        // Update player scores (called by game coordinator)
        access(all) fun updatePlayerScores(gameId: UInt64, scoreUpdates: {Address: Int256}) {
            pre {
                DeckZeroGame.games[gameId] != nil: "Game does not exist"
                DeckZeroGame.games[gameId]!.state == GameState.InProgress: "Game is not in progress"
            }
            
            let game = &DeckZeroGame.games[gameId]! as &Game
            
            // Update scores for all players
            for playerAddress in scoreUpdates.keys {
                if let player = &game.playerData[playerAddress] as &Player? {
                    player.score = player.score + scoreUpdates[playerAddress]!
                    
                    // Check for elimination (score <= -100)
                    if player.score <= -100 {
                        player.isEliminated = true
                    }
                }
            }
            
            game.currentRound = game.currentRound + 1
        }
        
        // Create admin resource
        access(all) fun createAdmin(): @Admin {
            return <-create Admin()
        }
    }
    
    // Public functions
    
    // Create a new game
    access(all) fun createGame(entryFee: UFix64, maxPlayers: UInt8): UInt64 {
        pre {
            maxPlayers > 1: "Game must allow at least 2 players"
            maxPlayers <= 50: "Too many players"
        }
        
        let gameId = self.nextGameId
        let game = Game(
            gameId: gameId,
            creator: self.account.address,
            entryFee: entryFee,
            maxPlayers: maxPlayers
        )
        
        self.games[gameId] = game
        self.nextGameId = self.nextGameId + 1
        self.totalGamesCreated = self.totalGamesCreated + 1
        
        emit GameCreated(
            gameId: gameId,
            creator: self.account.address,
            entryFee: entryFee,
            maxPlayers: maxPlayers
        )
        
        return gameId
    }
    
    // Join an existing game
    access(all) fun joinGame(gameId: UInt64, payment: UFix64) {
        pre {
            self.games[gameId] != nil: "Game does not exist"
            self.games[gameId]!.state == GameState.Created: "Game is not accepting new players"
            UInt8(self.games[gameId]!.players.length) < self.games[gameId]!.maxPlayers: "Game is full"
            payment >= self.games[gameId]!.entryFee: "Insufficient entry fee"
        }
        
        let game = &self.games[gameId]! as &Game
        let playerAddress = self.account.address
        
        // Check if player already joined
        for player in game.players {
            if player == playerAddress {
                panic("Player already joined this game")
            }
        }
        
        // Add player to game
        game.players.append(playerAddress)
        game.playerData[playerAddress] = Player(address: playerAddress)
        game.totalPrize = game.totalPrize + payment
        
        // Start game if full
        if UInt8(game.players.length) == game.maxPlayers {
            game.state = GameState.InProgress
        }
        
        emit PlayerJoined(gameId: gameId, player: playerAddress)
    }
    
    // Get game information
    access(all) view fun getGameInfo(gameId: UInt64): Game? {
        return self.games[gameId]
    }
    
    // Get player information
    access(all) view fun getPlayerInfo(gameId: UInt64, playerAddress: Address): Player? {
        if let game = self.games[gameId] {
            return game.playerData[playerAddress]
        }
        return nil
    }
    
    // Get active players count
    access(all) view fun getActivePlayersCount(gameId: UInt64): UInt8 {
        if let game = self.games[gameId] {
            var activeCount: UInt8 = 0
            for player in game.playerData.values {
                if !player.isEliminated {
                    activeCount = activeCount + 1
                }
            }
            return activeCount
        }
        return 0
    }
    
    // Get all games
    access(all) view fun getAllGames(): [UInt64] {
        return self.games.keys
    }
    
    // Get games by state
    access(all) view fun getGamesByState(state: GameState): [UInt64] {
        let filteredGames: [UInt64] = []
        for gameId in self.games.keys {
            if self.games[gameId]!.state == state {
                filteredGames.append(gameId)
            }
        }
        return filteredGames
    }
    
    // Contract initialization
    init() {
        self.games = {}
        self.nextGameId = 0
        self.totalGamesCreated = 0
        
        // Create and store admin resource
        let admin <- create Admin()
        self.account.save(<-admin, to: /storage/DeckZeroGameAdmin)
        
        // Create public capability for admin
        self.account.link<&Admin>(
            /public/DeckZeroGameAdmin,
            target: /storage/DeckZeroGameAdmin
        )
    }
}