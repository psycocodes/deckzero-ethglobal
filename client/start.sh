#!/bin/bash

# DeckZero Quick Start Script
echo "🚀 Starting DeckZero Enhanced Gaming Platform..."

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local not found!"
    echo "📝 Please copy .env.local.example to .env.local and configure your keys:"
    echo "   cp .env.local.example .env.local"
    echo ""
    echo "🔧 Required configurations:"
    echo "   - Web3Auth Client ID"
    echo "   - WalletConnect Project ID" 
    echo "   - Alchemy API Key"
    echo "   - Flow contract addresses"
    echo ""
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start development server
echo "🌐 Starting Next.js development server..."
echo "✅ Dashboard: http://localhost:3000/dashboard"
echo "🎮 Game: http://localhost:3000/game/beauty-contest"
echo "📊 API: http://localhost:3000/api/game/results"

npm run dev