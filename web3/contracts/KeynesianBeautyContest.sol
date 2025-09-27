// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title KeynesianBeautyContest
 * @dev A multiplayer game contract implementing the Keynesian Beauty Contest
 */
contract KeynesianBeautyContest {
    
    // Game states
    enum GameState { Created, InProgress, Ended }
    
    // Player data structure
    struct Player {
        address playerAddress;
        int256 score;
        bool isEliminated;
    }
    
    // Game data structure
    struct Game {
        uint256 gameId;
        uint256 entryFee;
        uint8 maxPlayers;
        uint8 currentPlayers;
        GameState state;
        address[] players;
        mapping(address => Player) playerData;
        mapping(address => bool) hasJoined;
        bool rule1Active;
        bool rule2Active;
        bool rule3Active;
        uint256 currentRound;
        address gameCoordinator;
    }
    
    // Storage
    mapping(uint256 => Game) public games;
    uint256 public nextGameId;
    
    // Events
    event GameCreated(uint256 indexed gameId, address indexed creator, uint256 entryFee, uint8 maxPlayers);
    event PlayerJoined(uint256 indexed gameId, address indexed player);
    event RoundSettled(uint256 indexed gameId, uint256 indexed roundNo, address indexed winner);
    event PlayerEliminated(uint256 indexed gameId, address indexed player);
    event GameClear(uint256 indexed gameId, address indexed winner);
    event RuleUnlocked(uint256 indexed gameId, uint8 ruleNumber);
    
    // Modifiers
    modifier gameExists(uint256 gameId) {
        require(gameId < nextGameId, "Game does not exist");
        _;
    }
    
    modifier onlyGameCoordinator(uint256 gameId) {
        require(msg.sender == games[gameId].gameCoordinator, "Only game coordinator can call this function");
        _;
    }
    
    modifier gameInProgress(uint256 gameId) {
        require(games[gameId].state == GameState.InProgress, "Game is not in progress");
        _;
    }
    
    /**
     * @dev Creates a new game with specified parameters
     * @param entryFee The fee required to join the game (in wei)
     * @param maxPlayers Maximum number of players allowed in the game
     */
    function createGame(uint256 entryFee, uint8 maxPlayers) external returns (uint256) {
        require(maxPlayers > 1, "Game must allow at least 2 players");
        require(maxPlayers <= 50, "Too many players"); // Reasonable limit
        
        uint256 gameId = nextGameId++;
        Game storage newGame = games[gameId];
        
        newGame.gameId = gameId;
        newGame.entryFee = entryFee;
        newGame.maxPlayers = maxPlayers;
        newGame.currentPlayers = 0;
        newGame.state = GameState.Created;
        newGame.rule1Active = false;
        newGame.rule2Active = false;
        newGame.rule3Active = false;
        newGame.currentRound = 0;
        newGame.gameCoordinator = msg.sender;
        
        emit GameCreated(gameId, msg.sender, entryFee, maxPlayers);
        
        return gameId;
    }
    
    /**
     * @dev Allows a player to join an existing game
     * @param gameId The ID of the game to join
     */
    function joinGame(uint256 gameId) external payable gameExists(gameId) {
        Game storage game = games[gameId];
        
        require(game.state == GameState.Created, "Game is not accepting new players");
        require(game.currentPlayers < game.maxPlayers, "Game is full");
        require(!game.hasJoined[msg.sender], "Player already joined this game");
        require(msg.value == game.entryFee, "Incorrect entry fee");
        
        // Add player to the game
        game.players.push(msg.sender);
        game.playerData[msg.sender] = Player({
            playerAddress: msg.sender,
            score: 0,
            isEliminated: false
        });
        game.hasJoined[msg.sender] = true;
        game.currentPlayers++;
        
        // Start the game if it's full
        if (game.currentPlayers == game.maxPlayers) {
            game.state = GameState.InProgress;
        }
        
        emit PlayerJoined(gameId, msg.sender);
    }
    
    /**
     * @dev Settles a round with results from the game coordinator
     * @param gameId The ID of the game
     * @param roundNo The round number being settled
     * @param winner The address of the round winner
     * @param scoreUpdates Array of score changes for all players (in player order)
     * @param newRule New rule that got unlocked (0 = no new rule, 1-3 = rule number)
     */
    function settleRound(
        uint256 gameId,
        uint256 roundNo,
        address winner,
        int256[] memory scoreUpdates,
        uint8 newRule
    ) external gameExists(gameId) onlyGameCoordinator(gameId) gameInProgress(gameId) {
        Game storage game = games[gameId];
        
        require(roundNo == game.currentRound + 1, "Invalid round number");
        require(scoreUpdates.length == game.players.length, "Score updates length mismatch");
        require(game.hasJoined[winner], "Winner is not a player in this game");
        require(!game.playerData[winner].isEliminated, "Winner cannot be eliminated");
        
        // Update scores and check for eliminations
        for (uint256 i = 0; i < game.players.length; i++) {
            address playerAddr = game.players[i];
            Player storage player = game.playerData[playerAddr];
            
            if (!player.isEliminated) {
                player.score += scoreUpdates[i];
                
                // Check if player should be eliminated (score <= -100 for example)
                if (player.score <= -100) {
                    player.isEliminated = true;
                    emit PlayerEliminated(gameId, playerAddr);
                }
            }
        }
        
        // Update round number
        game.currentRound = roundNo;
        
        // Handle new rule unlocking
        if (newRule == 1 && !game.rule1Active) {
            game.rule1Active = true;
            emit RuleUnlocked(gameId, 1);
        } else if (newRule == 2 && !game.rule2Active) {
            game.rule2Active = true;
            emit RuleUnlocked(gameId, 2);
        } else if (newRule == 3 && !game.rule3Active) {
            game.rule3Active = true;
            emit RuleUnlocked(gameId, 3);
        }
        
        emit RoundSettled(gameId, roundNo, winner);
    }
    
    /**
     * @dev Ends the game and declares a winner
     * @param gameId The ID of the game to end
     */
    function endGame(uint256 gameId) external gameExists(gameId) onlyGameCoordinator(gameId) gameInProgress(gameId) {
        Game storage game = games[gameId];
        
        // Find the winner (player with highest score who is not eliminated)
        address winner;
        int256 highestScore = type(int256).min;
        
        for (uint256 i = 0; i < game.players.length; i++) {
            address playerAddr = game.players[i];
            Player storage player = game.playerData[playerAddr];
            
            if (!player.isEliminated && player.score > highestScore) {
                highestScore = player.score;
                winner = playerAddr;
            }
        }
        
        require(winner != address(0), "No valid winner found");
        
        // End the game
        game.state = GameState.Ended;
        
        // Transfer prize pool to winner (total entry fees)
        uint256 prizePool = game.entryFee * game.currentPlayers;
        payable(winner).transfer(prizePool);
        
        emit GameClear(gameId, winner);
    }
    
    /**
     * @dev Gets player information for a specific game
     * @param gameId The ID of the game
     * @param playerAddr The address of the player
     */
    function getPlayerInfo(uint256 gameId, address playerAddr) external view gameExists(gameId) returns (int256 score, bool isEliminated) {
        require(games[gameId].hasJoined[playerAddr], "Player is not in this game");
        Player storage player = games[gameId].playerData[playerAddr];
        return (player.score, player.isEliminated);
    }
    
    /**
     * @dev Gets game information
     * @param gameId The ID of the game
     */
    function getGameInfo(uint256 gameId) external view gameExists(gameId) returns (
        uint256 entryFee,
        uint8 maxPlayers,
        uint8 currentPlayers,
        GameState state,
        bool rule1Active,
        bool rule2Active,
        bool rule3Active,
        uint256 currentRound,
        address gameCoordinator
    ) {
        Game storage game = games[gameId];
        return (
            game.entryFee,
            game.maxPlayers,
            game.currentPlayers,
            game.state,
            game.rule1Active,
            game.rule2Active,
            game.rule3Active,
            game.currentRound,
            game.gameCoordinator
        );
    }
    
    /**
     * @dev Gets the list of players in a game
     * @param gameId The ID of the game
     */
    function getGamePlayers(uint256 gameId) external view gameExists(gameId) returns (address[] memory) {
        return games[gameId].players;
    }
    
    /**
     * @dev Gets the number of active (non-eliminated) players in a game
     * @param gameId The ID of the game
     */
    function getActivePlayersCount(uint256 gameId) external view gameExists(gameId) returns (uint256) {
        Game storage game = games[gameId];
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < game.players.length; i++) {
            if (!game.playerData[game.players[i]].isEliminated) {
                activeCount++;
            }
        }
        
        return activeCount;
    }
    
    /**
     * @dev Emergency function to withdraw contract balance (only for stuck funds)
     */
    function emergencyWithdraw() external {
        // This should only be used if there are stuck funds due to failed transfers
        // In a production environment, this should have proper access control
        require(msg.sender == address(this), "Only contract can call this");
    }
}
