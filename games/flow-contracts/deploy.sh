#!/bin/bash

# DeckZero Flow Contracts Deployment Script

echo "🎮 DeckZero Flow Contracts Deployment"
echo "===================================="

# Check if Flow CLI is installed
if ! command -v flow &> /dev/null; then
    echo "❌ Flow CLI not found. Please install it first:"
    echo "   Visit: https://developers.flow.com/tools/flow-cli"
    exit 1
fi

echo "✅ Flow CLI found"

# Function to deploy to emulator
deploy_to_emulator() {
    echo ""
    echo "🚀 Deploying to Flow Emulator..."
    
    # Start emulator in background if not running
    echo "Starting Flow emulator..."
    flow emulator start --verbose &
    EMULATOR_PID=$!
    
    # Wait for emulator to be ready
    sleep 5
    
    # Deploy contracts
    echo "Deploying contracts to emulator..."
    flow project deploy --network emulator
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully deployed to emulator!"
        echo ""
        echo "📋 Emulator Contract Addresses:"
        echo "GameRewards: 0xf8d6e0586b0a20c7"
        echo "TokenRewards: 0xf8d6e0586b0a20c7"
        echo "PlayerProfile: 0xf8d6e0586b0a20c7"
    else
        echo "❌ Emulator deployment failed"
    fi
    
    # Keep emulator running for testing
    echo ""
    echo "Emulator is running on http://localhost:8080"
    echo "Press Ctrl+C to stop the emulator"
    wait $EMULATOR_PID
}

# Function to deploy to testnet
deploy_to_testnet() {
    echo ""
    echo "🌐 Deploying to Flow Testnet..."
    
    # Check if testnet account is configured
    TESTNET_ADDRESS=$(flow config get accounts.testnet-account.address 2>/dev/null)
    if [ "$TESTNET_ADDRESS" = "YOUR_TESTNET_ACCOUNT_ADDRESS" ] || [ -z "$TESTNET_ADDRESS" ]; then
        echo "❌ Testnet account not configured!"
        echo ""
        echo "Please update flow.json with your testnet account:"
        echo "1. Create account at https://testnet-faucet.onflow.org/"
        echo "2. Update 'testnet-account' address and private key in flow.json"
        echo "3. Run this script again"
        exit 1
    fi
    
    echo "Deploying to testnet account: $TESTNET_ADDRESS"
    
    # Deploy contracts
    flow project deploy --network testnet
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully deployed to testnet!"
        echo ""
        echo "📋 Testnet Contract Addresses:"
        echo "Update your .env.local with these addresses:"
        echo "NEXT_PUBLIC_FLOW_GAME_CONTRACT_ADDRESS=$TESTNET_ADDRESS"
        echo "NEXT_PUBLIC_FLOW_NFT_CONTRACT_ADDRESS=$TESTNET_ADDRESS" 
        echo "NEXT_PUBLIC_FLOW_TOKEN_CONTRACT_ADDRESS=$TESTNET_ADDRESS"
    else
        echo "❌ Testnet deployment failed"
        exit 1
    fi
}

# Function to verify contracts
verify_contracts() {
    echo ""
    echo "🔍 Verifying contract deployment..."
    
    # Check GameRewards contract
    flow scripts execute --network emulator <<EOF
import GameRewards from 0xf8d6e0586b0a20c7

pub fun main(): UInt64 {
    return GameRewards.totalSupply
}
EOF
    
    if [ $? -eq 0 ]; then
        echo "✅ GameRewards contract verified"
    else
        echo "❌ GameRewards contract verification failed"
    fi
}

# Main deployment flow
echo "Choose deployment target:"
echo "1. Emulator (for testing)"
echo "2. Testnet (for production)"
echo "3. Both"
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        deploy_to_emulator
        ;;
    2)
        deploy_to_testnet
        ;;
    3)
        deploy_to_emulator
        sleep 3
        deploy_to_testnet
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "Next steps:"
echo "1. Update .env.local with contract addresses"
echo "2. Test the integration with: npm run dev"
echo "3. Check Unity game rewards functionality"