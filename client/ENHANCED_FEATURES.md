# DeckZero Enhanced Flow-Ethereum Integration

A comprehensive blockchain gaming platform that bridges Flow and Ethereum networks, featuring Unity WebGL games, automated reward distribution, ENS badge minting, and Web3 social authentication.

## 🚀 Features Overview

### ✅ Completed Core Features

1. **Flow Blockchain Integration**
   - Flow wallet onboarding using Glow wallet and Web3Auth
   - Smart contract interactions for game rewards
   - NFT minting and token distribution
   - Scheduled Flow Actions for delayed rewards

2. **ENS Badge System**
   - Automatic ENS subdomain minting for game winners
   - Integration with WalletConnect for Ethereum transactions
   - Custom subdomain generation based on game achievements

3. **Unity WebGL Embedding**
   - Enhanced GameWrapper with Flow integration
   - Real-time game result processing
   - JavaScript bridge for Unity-blockchain communication

4. **Web3 Social Authentication**
   - Web3Auth integration with social login (Google, GitHub, Discord)
   - Automatic Flow wallet creation for Web2 users
   - Seamless onboarding experience

5. **Comprehensive API Endpoints**
   - Game result processing (`/api/game/results`)
   - Player profile management (`/api/player/profile`)
   - Automated reward distribution
   - Leaderboard functionality

6. **Player Dashboard**
   - Flow wallet balance display
   - NFT collection showcase
   - Game history and statistics
   - ENS badge collection
   - Global leaderboard

## 🏗️ Architecture

### Service Layer
```
services/
├── flow.ts          # Flow blockchain interactions
├── ens.ts           # ENS subdomain management  
├── web3auth.ts      # Social authentication
└── logger.ts        # Transaction logging
```

### API Layer
```
api/
├── game/results/    # Game result processing
└── player/profile/  # Player data management
```

### Components
```
components/
├── EnhancedGameWrapper.tsx    # Unity + blockchain integration
├── PlayerDashboard.tsx        # Player statistics UI
├── ConnectButton.tsx          # Wallet connection
└── Web3Providers.tsx          # Web3 context
```

## 🔧 Configuration

### Environment Variables
Create `.env.local` from `.env.local.example`:

```bash
# Flow Configuration
NEXT_PUBLIC_FLOW_NETWORK=testnet
NEXT_PUBLIC_FLOW_ACCESS_NODE_API=https://rest-testnet.onflow.org
NEXT_PUBLIC_FLOW_WALLET_DISCOVERY=https://fcl-discovery.onflow.org/testnet/authn

# Flow Contract Addresses
NEXT_PUBLIC_FLOW_GAME_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_FLOW_NFT_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_FLOW_TOKEN_CONTRACT_ADDRESS=0x...

# Ethereum Configuration
NEXT_PUBLIC_ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_ETHEREUM_CHAIN_ID=11155111

# ENS Configuration
NEXT_PUBLIC_ENS_REGISTRY_ADDRESS=0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e
NEXT_PUBLIC_DECKZERO_ENS_DOMAIN=deckzero.eth

# Web3Auth Configuration
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=your_client_id
NEXT_PUBLIC_WEB3AUTH_NETWORK=sapphire_devnet

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### Dependencies
Required packages (add to package.json):

```json
{
  "dependencies": {
    "@onflow/fcl": "^1.12.2",
    "@onflow/sdk": "^1.5.1",
    "@web3auth/modal": "^8.12.4",
    "@web3auth/ethereum-provider": "^8.12.4",
    "@web3auth/base": "^8.12.4",
    "winston": "^3.11.0"
  }
}
```

## 🎮 Game Integration Flow

### 1. User Authentication
```typescript
// Social login with Web3Auth
const user = await web3AuthService.login();
// Automatic Flow wallet creation
const flowWallet = await web3AuthService.createFlowAccount();
```

### 2. Unity Game Initialization
```typescript
// Game session setup
const initData = {
  sessionId: "session_unique_id",
  playerId: user.userId,
  flowAddress: user.flowAddress,
  ethereumAddress: user.ethereumAddress,
  gameType: "beauty-contest"
};
sendMessage("GameManager", "InitializeGame", JSON.stringify(initData));
```

### 3. Game Result Processing
```typescript
// Unity sends result to React
const gameResult = {
  gameSessionId: "session_unique_id",
  winnerId: "player_id",
  playerList: [...],
  gameStats: {...}
};

// React processes via API
const response = await fetch('/api/game/results', {
  method: 'POST',
  body: JSON.stringify(gameResult)
});
```

### 4. Reward Distribution
```typescript
// Automatic Flow NFT minting
await flowService.rewardPlayerWithNFT(winnerId, nftMetadata);

// ENS badge minting
await ensService.mintSubdomain(winnerAddress, "winner-beauty-contest-2024");

// Scheduled Flow Actions
await flowService.scheduleRewardAction(winnerId, rewardData);
```

## 🌊 Flow Blockchain Features

### Smart Contracts
- **GameRewards Contract**: Manages game reward distribution
- **PlayerNFT Contract**: Mints achievement NFTs
- **GameToken Contract**: Distributes game tokens

### Flow Actions
```cadence
// Example reward transaction
transaction(recipient: Address, amount: UFix64) {
  prepare(signer: AuthAccount) {
    // Mint tokens to winner
    let tokenMinter = signer.borrow<&GameToken.Minter>(from: /storage/TokenMinter)
    tokenMinter?.mintTokens(amount: amount, recipient: recipient)
  }
}
```

### Player Profiles
```typescript
interface FlowPlayer {
  address: string;
  nfts: string[];
  tokenBalance: number;
  gameHistory: GameRecord[];
  achievements: Achievement[];
}
```

## 🏷️ ENS Badge System

### Subdomain Generation
```typescript
const generateSubdomain = (gameType: string, achievement: string, timestamp: number): string => {
  const date = new Date(timestamp).toISOString().slice(0, 10).replace(/-/g, '');
  return `${gameType}-${achievement}-${date}`.toLowerCase();
};
```

### Minting Process
1. Generate unique subdomain based on achievement
2. Check availability in ENS registry
3. Connect to Ethereum wallet via WalletConnect
4. Execute ENS subdomain creation transaction
5. Store badge in player profile

### Badge Examples
- `winner-beauty-contest-20241208.deckzero.eth`
- `highscore-puzzle-master-20241208.deckzero.eth`
- `perfect-game-strategy-20241208.deckzero.eth`

## 📊 Player Dashboard Features

### Statistics Display
- Games played and win rate
- Flow token balance
- NFT collection with rarity indicators
- ENS badge showcase
- Game history timeline

### Leaderboard
- Global player rankings
- Win rate comparisons
- Achievement counts
- Recent activity feed

### Wallet Management
- Flow address display
- Ethereum address display
- Transaction history
- Reward notifications

## 🔐 Security Considerations

### Authentication
- Web3Auth provides secure social login
- Private keys managed by Web3Auth infrastructure
- Multi-factor authentication support

### Transaction Security
- All transactions logged via Winston
- Error handling and fallback mechanisms
- Rate limiting on API endpoints

### Data Validation
- Game result validation before processing
- Address format verification
- Signature validation for transactions

## 📱 Mobile Support

### Responsive Design
- Mobile-optimized Unity WebGL embedding
- Touch-friendly UI controls
- Progressive Web App features

### Mobile Wallets
- WalletConnect mobile integration
- Native mobile wallet support
- QR code authentication

## 🚧 Development Workflow

### Setup
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Start development server
npm run dev
```

### Testing
```bash
# Run tests
npm test

# Build for production
npm run build
```

### Deployment
```bash
# Deploy to Vercel
vercel --prod

# Environment variables required in production
```

## 🔮 Future Enhancements

### Phase 2 Features
- [ ] Multi-game tournament system
- [ ] Cross-chain asset bridging
- [ ] Advanced NFT trading marketplace
- [ ] Guild and team features
- [ ] Streaming integration (Twitch/YouTube)

### Technical Improvements
- [ ] Database integration (PostgreSQL)
- [ ] Redis caching layer
- [ ] WebSocket real-time updates
- [ ] Mobile app development
- [ ] Advanced analytics dashboard

### Game Features
- [ ] Multiple Unity games
- [ ] Custom game creation tools
- [ ] AI-powered matchmaking
- [ ] Virtual reality support
- [ ] Augmented reality features

## 📖 API Documentation

### Game Results Endpoint
```
POST /api/game/results
{
  "gameSessionId": "string",
  "gameType": "string", 
  "winnerId": "string",
  "playerList": [...],
  "gameStats": {...}
}
```

### Player Profile Endpoint
```
GET /api/player/profile?userId=string
POST /api/player/profile (create/update)
PUT /api/player/profile (leaderboard)
DELETE /api/player/profile?userId=string (admin)
```

## 🤝 Contributing

### Code Style
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Conventional commits

### Pull Request Process
1. Fork the repository
2. Create feature branch
3. Add comprehensive tests
4. Update documentation
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

### Documentation
- Flow Developer Portal
- Web3Auth Documentation
- Unity WebGL Guide
- ENS Developer Docs

### Community
- Discord: [DeckZero Community]
- GitHub Issues: Technical support
- Twitter: [@DeckZeroGames]

---

**Built with ❤️ for ETHGlobal Hackathon**

*This enhanced system provides a complete bridge between Web2 gaming and Web3 rewards, making blockchain gaming accessible to mainstream users through familiar social login while providing powerful on-chain features for crypto-native players.*