# 🚀 DeckZero Enhanced Setup & Deployment Guide

Complete guide for setting up and deploying the DeckZero Flow-Ethereum integration system with Unity WebGL games, automated rewards, and ENS badges.

## 📋 Prerequisites

### Required Accounts & Services
1. **Web3Auth Account**: https://dashboard.web3auth.io/
2. **WalletConnect Account**: https://cloud.walletconnect.com/
3. **Alchemy Account**: https://www.alchemy.com/ (for Ethereum RPC)
4. **Flow Account**: https://flowscan.org/ (for Flow Testnet/Mainnet)
5. **ENS Domain**: Register a .eth domain for badge minting
6. **Vercel Account**: https://vercel.com/ (for deployment)

### Development Tools
```bash
# Node.js 18+ and npm
node --version  # Should be 18+
npm --version   # Should be 8+

# Git
git --version

# Flow CLI (for smart contract deployment)
# Windows PowerShell (Run as Administrator)
iex "& { $(irm 'https://storage.googleapis.com/flow-cli/install.ps1') }"

# Verify Flow CLI installation
flow version
```

## 🏗️ Step 1: Project Setup

### Clone and Install Dependencies
```bash
# Clone the repository
git clone https://github.com/psycocodes/deckzero-ethglobal.git
cd deckzero-ethglobal/client

# Install dependencies (already done based on terminal output)
npm install

# Verify all packages are installed
npm list | grep -E "(web3auth|onflow|winston)"
```

### Verify File Structure
```
client/
├── app/
│   ├── api/
│   │   ├── game/results/route.ts    ✅ Game result processing
│   │   └── player/profile/route.ts  ✅ Player profile management
│   ├── dashboard/page.tsx           ✅ Player dashboard
│   └── game/[slug]/page.tsx         ✅ Game pages
├── components/
│   ├── EnhancedGameWrapper.tsx      ✅ Unity + Blockchain integration
│   └── PlayerDashboard.tsx          ✅ Player stats UI
├── services/
│   ├── flow.ts                      ✅ Flow blockchain service
│   ├── ens.ts                       ✅ ENS subdomain service
│   ├── web3auth.ts                  ✅ Social authentication
│   └── logger.ts                    ✅ Transaction logging
└── config/index.ts                  ✅ Configuration system
```

## 🔧 Step 2: Service Account Setup

### 2.1 Web3Auth Configuration
1. Go to https://dashboard.web3auth.io/
2. Create new project: "DeckZero Gaming Platform"
3. Get your **Client ID**
4. Configure social login providers:

```json
// Social Login Setup in Web3Auth Dashboard
{
  "google": {
    "enabled": true,
    "name": "Google",
    "description": "Login with your Google account"
  },
  "github": {
    "enabled": true,
    "name": "GitHub", 
    "description": "Login with your GitHub account"
  },
  "discord": {
    "enabled": true,
    "name": "Discord",
    "description": "Login with your Discord account"
  }
}
```

5. Set redirect URLs:
   - Development: `http://localhost:3000`
   - Production: `https://your-domain.vercel.app`

### 2.2 WalletConnect Project Setup
1. Go to https://cloud.walletconnect.com/
2. Create new project: "DeckZero"
3. Get your **Project ID**
4. Configure allowed domains:
   - `localhost:3000`
   - `your-domain.vercel.app`

### 2.3 Alchemy RPC Setup
1. Go to https://www.alchemy.com/
2. Create app: "DeckZero Ethereum"
3. Select networks:
   - **Ethereum Mainnet** (for production ENS)
   - **Sepolia Testnet** (for testing)
4. Get your **API Key**

## 🌊 Step 3: Flow Blockchain Setup

### 3.1 Flow Account Creation
```bash
# Create Flow account for testnet
flow accounts create

# This will output:
# Address: 0x1234567890abcdef
# Private Key: abc123...
# Network: testnet

# Save these credentials securely!
```

### 3.2 Deploy Flow Smart Contracts

Create Flow contracts directory:
```bash
mkdir -p flow-contracts/contracts
mkdir -p flow-contracts/transactions
mkdir -p flow-contracts/scripts
```

**GameRewards Contract** (`flow-contracts/contracts/GameRewards.cdc`):
```cadence
// GameRewards.cdc - Flow smart contract for game rewards
import NonFungibleToken from 0x631e88ae7f1d7c20
import MetadataViews from 0x631e88ae7f1d7c20

pub contract GameRewards: NonFungibleToken {
    pub var totalSupply: UInt64
    
    pub event ContractInitialized()
    pub event Withdraw(id: UInt64, from: Address?)
    pub event Deposit(id: UInt64, to: Address?)
    pub event Minted(id: UInt64, recipient: Address, gameType: String)

    pub let CollectionStoragePath: StoragePath
    pub let CollectionPublicPath: PublicPath
    pub let MinterStoragePath: StoragePath

    pub resource NFT: NonFungibleToken.INFT, MetadataViews.Resolver {
        pub let id: UInt64
        pub let gameType: String
        pub let achievement: String
        pub let dateEarned: UFix64
        pub let metadata: {String: AnyStruct}

        init(id: UInt64, gameType: String, achievement: String, metadata: {String: AnyStruct}) {
            self.id = id
            self.gameType = gameType
            self.achievement = achievement
            self.dateEarned = getCurrentBlock().timestamp
            self.metadata = metadata
        }

        pub fun getViews(): [Type] {
            return [
                Type<MetadataViews.Display>(),
                Type<MetadataViews.NFTCollectionData>(),
                Type<MetadataViews.NFTCollectionDisplay>()
            ]
        }

        pub fun resolveView(_ view: Type): AnyStruct? {
            switch view {
                case Type<MetadataViews.Display>():
                    return MetadataViews.Display(
                        name: "DeckZero ".concat(self.achievement),
                        description: "Achievement earned in ".concat(self.gameType),
                        thumbnail: MetadataViews.HTTPFile(
                            url: "https://deckzero.com/nft/".concat(self.id.toString())
                        )
                    )
            }
            return nil
        }
    }

    pub resource Collection: NonFungibleToken.Provider, NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection {
        pub var ownedNFTs: @{UInt64: NonFungibleToken.NFT}

        init() {
            self.ownedNFTs <- {}
        }

        pub fun withdraw(withdrawID: UInt64): @NonFungibleToken.NFT {
            let token <- self.ownedNFTs.remove(key: withdrawID) ?? panic("Missing NFT")
            emit Withdraw(id: token.id, from: self.owner?.address)
            return <-token
        }

        pub fun deposit(token: @NonFungibleToken.NFT) {
            let token <- token as! @GameRewards.NFT
            let id: UInt64 = token.id
            let oldToken <- self.ownedNFTs[id] <- token
            emit Deposit(id: id, to: self.owner?.address)
            destroy oldToken
        }

        pub fun getIDs(): [UInt64] {
            return self.ownedNFTs.keys
        }

        pub fun borrowNFT(id: UInt64): &NonFungibleToken.NFT {
            return (&self.ownedNFTs[id] as &NonFungibleToken.NFT?)!
        }

        pub fun borrowViewResolver(id: UInt64): &AnyResource{MetadataViews.Resolver} {
            let nft = (&self.ownedNFTs[id] as auth &NonFungibleToken.NFT?)!
            let gameReward = nft as! &GameRewards.NFT
            return gameReward as &AnyResource{MetadataViews.Resolver}
        }

        destroy() {
            destroy self.ownedNFTs
        }
    }

    pub fun createEmptyCollection(): @NonFungibleToken.Collection {
        return <- create Collection()
    }

    pub resource NFTMinter {
        pub fun mintNFT(recipient: &{NonFungibleToken.CollectionPublic}, gameType: String, achievement: String, metadata: {String: AnyStruct}) {
            let newNFT <- create NFT(id: GameRewards.totalSupply, gameType: gameType, achievement: achievement, metadata: metadata)
            let recipient = recipient as! &GameRewards.Collection{NonFungibleToken.CollectionPublic}
            
            emit Minted(id: newNFT.id, recipient: recipient.owner!.address, gameType: gameType)
            
            recipient.deposit(token: <-newNFT)
            GameRewards.totalSupply = GameRewards.totalSupply + UInt64(1)
        }
    }

    init() {
        self.totalSupply = 0
        self.CollectionStoragePath = /storage/GameRewardsCollection
        self.CollectionPublicPath = /public/GameRewardsCollection
        self.MinterStoragePath = /storage/GameRewardsMinter

        let collection <- create Collection()
        self.account.save(<-collection, to: self.CollectionStoragePath)

        self.account.link<&GameRewards.Collection{NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}>(
            self.CollectionPublicPath,
            target: self.CollectionStoragePath
        )

        let minter <- create NFTMinter()
        self.account.save(<-minter, to: self.MinterStoragePath)

        emit ContractInitialized()
    }
}
```

**Deploy Contract** (`flow-contracts/deploy.sh`):
```bash
#!/bin/bash

# Deploy to Flow Testnet
echo "Deploying GameRewards contract to Flow Testnet..."

flow accounts add-contract GameRewards ./contracts/GameRewards.cdc \\
  --signer your-account-name \\
  --network testnet

echo "Contract deployed successfully!"
echo "Contract Address: Check Flow scan for your account"
```

Make script executable and deploy:
```bash
chmod +x flow-contracts/deploy.sh
cd flow-contracts
./deploy.sh
```

## 🏷️ Step 4: ENS Domain Setup

### 4.1 Register ENS Domain
1. Go to https://app.ens.domains/
2. Search for available domain: `deckzero.eth`
3. Register for 1+ years
4. Set yourself as controller

### 4.2 Configure ENS Subdomains
```javascript
// ENS Subdomain Setup Script (run in browser console on ENS app)
// This sets up your domain to allow programmatic subdomain creation

// 1. Set resolver to public resolver
await ens.setResolver('deckzero.eth', '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63');

// 2. Create subdomain controller record
await ens.setSubnodeOwner('deckzero.eth', 'winner', yourAddress);
await ens.setSubnodeOwner('deckzero.eth', 'champion', yourAddress);
await ens.setSubnodeOwner('deckzero.eth', 'master', yourAddress);
```

## 📝 Step 5: Environment Configuration

Create `.env.local` file:
```bash
# Copy example file
cp .env.local.example .env.local

# Edit with your values
nano .env.local
```

**Complete `.env.local` configuration:**
```bash
# ========================================
# FLOW BLOCKCHAIN CONFIGURATION
# ========================================
NEXT_PUBLIC_FLOW_NETWORK=testnet
NEXT_PUBLIC_FLOW_ACCESS_NODE_API=https://rest-testnet.onflow.org
NEXT_PUBLIC_FLOW_WALLET_DISCOVERY=https://fcl-discovery.onflow.org/testnet/authn

# Flow Contract Addresses (from Step 3.2 deployment)
NEXT_PUBLIC_FLOW_GAME_CONTRACT_ADDRESS=0x1234567890abcdef  # Your deployed contract
NEXT_PUBLIC_FLOW_NFT_CONTRACT_ADDRESS=0x1234567890abcdef   # Same as above for now
NEXT_PUBLIC_FLOW_TOKEN_CONTRACT_ADDRESS=0x1234567890abcdef # Same as above for now

# Flow Account for Server Operations
FLOW_PRIVATE_KEY=your_flow_private_key_here
FLOW_ADDRESS=0x1234567890abcdef

# ========================================
# ETHEREUM BLOCKCHAIN CONFIGURATION
# ========================================
NEXT_PUBLIC_ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
NEXT_PUBLIC_ETHEREUM_CHAIN_ID=11155111  # Sepolia testnet
NEXT_PUBLIC_ETHEREUM_MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# ENS Configuration
NEXT_PUBLIC_ENS_REGISTRY_ADDRESS=0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e  # ENS Registry
NEXT_PUBLIC_DECKZERO_ENS_DOMAIN=deckzero.eth  # Your registered domain
ENS_CONTROLLER_PRIVATE_KEY=your_ethereum_private_key_with_ens_control

# ========================================
# WEB3AUTH CONFIGURATION  
# ========================================
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=your_web3auth_client_id_from_dashboard
NEXT_PUBLIC_WEB3AUTH_NETWORK=sapphire_devnet  # or sapphire_mainnet for production

# ========================================
# WALLETCONNECT CONFIGURATION
# ========================================
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# ========================================
# APPLICATION CONFIGURATION
# ========================================
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Update for production
NEXTAUTH_SECRET=your_random_secret_key_here
NEXTAUTH_URL=http://localhost:3000

# ========================================
# LOGGING & MONITORING
# ========================================
LOG_LEVEL=info  # debug, info, warn, error
ENABLE_TRANSACTION_LOGGING=true

# ========================================
# GAME CONFIGURATION
# ========================================
UNITY_GAME_PATH=/games
DEFAULT_GAME_REWARDS_ENABLED=true
MAX_DAILY_REWARDS_PER_PLAYER=10

# ========================================
# DATABASE (Future Enhancement)
# ========================================
# DATABASE_URL=postgresql://username:password@localhost:5432/deckzero
# REDIS_URL=redis://localhost:6379
```

## 🧪 Step 6: Local Testing

### 6.1 Start Development Server
```bash
cd client
npm run dev
```

You should see:
```
✓ Ready in 2.1s
✓ Local:        http://localhost:3000
✓ Network:      http://192.168.1.100:3000
```

### 6.2 Test Core Functionality

**1. Web3Auth Login Test:**
- Navigate to http://localhost:3000/game/beauty-contest
- Click "Login to Play"
- Test Google, GitHub, and Discord login
- Verify user profile creation

**2. Unity Game Integration Test:**
- Ensure Unity game loads properly
- Check browser console for initialization messages
- Verify Web3 service connections

**3. Game Result Processing Test:**
```bash
# Test API endpoint directly
curl -X POST http://localhost:3000/api/game/results \\
  -H "Content-Type: application/json" \\
  -d '{
    "gameSessionId": "test_session_123",
    "gameType": "beauty-contest", 
    "winnerId": "test_user",
    "playerList": [
      {
        "id": "test_user",
        "address": "0x742d35Cc6634C0532925a3b8D0a4E5c738a5d5d57",
        "score": 100,
        "rank": 1
      }
    ],
    "gameStats": {
      "duration": 300,
      "totalRounds": 5,
      "startTime": 1698765432000,
      "endTime": 1698765732000
    }
  }'
```

**4. Dashboard Test:**
- Navigate to http://localhost:3000/dashboard
- Login with Web3Auth
- Verify stats display and leaderboard

**5. Flow Blockchain Test:**
```bash
# Test Flow connection
flow scripts execute --code "
  pub fun main(): UFix64 {
    return getCurrentBlock().timestamp
  }
" --network testnet
```

## 🚀 Step 7: Production Deployment

### 7.1 Vercel Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to Vercel
vercel --prod

# Configure environment variables in Vercel dashboard
```

**Vercel Environment Variables Setup:**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add all variables from `.env.local` (except NEXTAUTH_URL)
5. Set `NEXTAUTH_URL=https://your-domain.vercel.app`

### 7.2 Domain Configuration
```bash
# Custom domain setup in Vercel
# 1. Go to Settings → Domains
# 2. Add your custom domain: deckzero.com
# 3. Configure DNS records as instructed
# 4. Update environment variables with new domain
```

### 7.3 Flow Mainnet Deployment
```bash
# Deploy contracts to Flow Mainnet
flow accounts add-contract GameRewards ./contracts/GameRewards.cdc \\
  --signer mainnet-account \\
  --network mainnet

# Update environment variables with mainnet addresses
```

## 🔧 Step 8: Advanced Configuration

### 8.1 Database Setup (Optional)
```bash
# PostgreSQL setup for production
# 1. Set up PostgreSQL database
# 2. Run migrations
npx prisma migrate deploy

# Redis setup for caching
# 1. Set up Redis instance
# 2. Update REDIS_URL in environment
```

### 8.2 Monitoring & Analytics
```bash
# Add error tracking (Sentry)
npm install @sentry/nextjs

# Add analytics (Vercel Analytics)
npm install @vercel/analytics
```

### 8.3 Security Hardening
```bash
# Environment variable validation
# Rate limiting setup  
# CORS configuration
# Security headers
```

## 📊 Step 9: Testing Checklist

### 🧪 Functionality Testing
- [ ] Web3Auth social login (Google, GitHub, Discord)
- [ ] Flow wallet creation and connection
- [ ] Unity WebGL game loading and interaction
- [ ] Game result processing and API calls
- [ ] Flow NFT minting for winners
- [ ] ENS subdomain creation for achievements
- [ ] Player dashboard stats display
- [ ] Leaderboard functionality
- [ ] Transaction logging and error handling

### 🌐 Cross-Platform Testing
- [ ] Desktop Chrome/Firefox/Safari
- [ ] Mobile iOS Safari
- [ ] Mobile Android Chrome
- [ ] Tablet responsiveness

### 🔒 Security Testing
- [ ] Input validation on all endpoints
- [ ] Authentication flow security
- [ ] Private key protection
- [ ] Smart contract interaction safety
- [ ] Rate limiting functionality

## 🚨 Troubleshooting Guide

### Common Issues & Solutions

**1. Web3Auth Login Fails**
```bash
# Check Client ID in environment
echo $NEXT_PUBLIC_WEB3AUTH_CLIENT_ID

# Verify redirect URLs in Web3Auth dashboard
# Ensure no CORS issues in browser console
```

**2. Flow Connection Issues**
```bash
# Test Flow network connectivity
flow blocks get latest --network testnet

# Check contract deployment
flow accounts get YOUR_FLOW_ADDRESS --network testnet
```

**3. ENS Subdomain Minting Fails**
```bash
# Verify ENS domain ownership
# Check Ethereum RPC connectivity
# Ensure sufficient ETH for gas fees
```

**4. Unity Game Loading Issues**
```bash
# Check Unity build files in public/games/
# Verify MIME types in next.config.ts
# Check browser console for WebGL errors
```

**5. API Endpoint Errors**
```bash
# Check Next.js API routes
# Verify environment variables
# Check service initialization
```

## 📈 Performance Optimization

### Client-Side Optimizations
```javascript
// next.config.ts optimizations
const nextConfig = {
  // Enable compression
  compress: true,
  // Optimize images
  images: {
    domains: ['deckzero.com'],
    formats: ['image/webp', 'image/avif'],
  },
  // Enable experimental features
  experimental: {
    webpackBuildWorker: true,
  }
};
```

### Unity WebGL Optimizations
```javascript
// Unity compression settings
const unityContextConfig = {
  loaderUrl: `/games/${gameId}/Build/${gameId}.loader.js`,
  dataUrl: `/games/${gameId}/Build/${gameId}.data.br`,      // Brotli compression
  frameworkUrl: `/games/${gameId}/Build/${gameId}.framework.js.br`,
  codeUrl: `/games/${gameId}/Build/${gameId}.wasm.br`,
  streamingAssetsUrl: "StreamingAssets",
  companyName: "DeckZero",
  productName: gameId,
  productVersion: "1.0",
};
```

## 🎯 Success Criteria

Your deployment is successful when:

✅ **Authentication Flow**
- Users can sign in with Google/GitHub/Discord
- Flow wallets are automatically created
- User profiles are saved and persisted

✅ **Game Integration** 
- Unity WebGL games load without errors
- Game-to-blockchain communication works
- Winner notifications appear

✅ **Blockchain Features**
- Flow NFTs are minted for game winners
- ENS subdomains are created for achievements
- Transaction logs are recorded

✅ **User Experience**
- Dashboard displays user stats and NFTs
- Leaderboard shows global rankings
- Mobile experience is responsive

## 📚 Additional Resources

### Documentation Links
- **Flow Developer Portal**: https://developers.flow.com/
- **Web3Auth Docs**: https://web3auth.io/docs/
- **WalletConnect Docs**: https://docs.walletconnect.com/
- **ENS Developer Docs**: https://docs.ens.domains/
- **Unity WebGL Guide**: https://docs.unity3d.com/Manual/webgl.html

### Community Support
- **Flow Discord**: https://discord.gg/flow
- **Web3Auth Discord**: https://discord.gg/web3auth
- **DeckZero Repository**: https://github.com/psycocodes/deckzero-ethglobal

---

## 🎉 Congratulations!

You now have a fully functional Web3 gaming platform that:
- Bridges Flow and Ethereum ecosystems
- Provides seamless Web2-to-Web3 onboarding
- Automatically rewards players with NFTs and ENS badges
- Offers a comprehensive player dashboard
- Supports Unity WebGL games with blockchain integration

**Your DeckZero platform is ready for ETHGlobal demonstration!** 🚀

### Next Steps for Demo
1. Create demo user accounts
2. Prepare sample game scenarios
3. Test complete user journey
4. Prepare presentation materials
5. Document key features for judges

**Built with ❤️ for ETHGlobal Hackathon**