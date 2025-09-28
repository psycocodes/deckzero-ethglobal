# 🌐 Flow Testnet Account Setup Guide

## For Development (Use Emulator)
For immediate testing, use the emulator instead:

```powershell
# Run this in games/flow-contracts/ directory
./deploy-emulator.bat
```

This will:
- Start Flow emulator locally
- Deploy all contracts 
- Give you contract addresses to use in `.env.local`

## For Production (Testnet Deployment)

### Step 1: Install Flow CLI
Download from: https://developers.flow.com/tools/flow-cli/install

### Step 2: Create Flow Testnet Account

#### Option A: Using Flow CLI (Recommended)
```powershell
# Generate a new key pair
flow keys generate

# Output will show:
# 🔴 Store private key safely and don't share with anyone! 
# Private Key: abc123...
# Public Key: def456...
```

#### Option B: Using Flow Faucet
1. Visit: https://testnet-faucet.onflow.org/
2. Create account and get FLOW tokens
3. Note your address and private key

### Step 3: Update flow.json
Replace the testnet-account section:

```json
"testnet-account": {
  "address": "0x1234567890abcdef",  // Your actual address
  "key": "your-private-key-here"     // Your actual private key  
}
```

### Step 4: Deploy to Testnet
```powershell
flow project deploy --network testnet
```

## ⚠️ Security Notes
- **NEVER** commit your private keys to Git
- Use environment variables for production keys
- Keep private keys secure and backed up

## Quick Setup for Development
If you just want to test the integration:

1. **Use Emulator** (recommended for development)
   ```powershell
   cd games/flow-contracts
   ./deploy-emulator.bat
   ```

2. **Update .env.local** with emulator addresses:
   ```env
   NEXT_PUBLIC_FLOW_GAME_CONTRACT_ADDRESS=0xf8d6e0586b0a20c7
   NEXT_PUBLIC_FLOW_NFT_CONTRACT_ADDRESS=0xf8d6e0586b0a20c7
   NEXT_PUBLIC_FLOW_TOKEN_CONTRACT_ADDRESS=0xf8d6e0586b0a20c7
   ```

3. **Start your app**:
   ```powershell
   cd ../../client
   npm run dev
   ```

The emulator provides the same functionality as testnet but runs locally!