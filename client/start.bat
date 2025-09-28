@echo off
REM DeckZero Quick Start Script for Windows

echo 🚀 Starting DeckZero Enhanced Gaming Platform...

REM Check if .env.local exists
if not exist ".env.local" (
    echo ⚠️  .env.local not found!
    echo 📝 Please copy .env.local.example to .env.local and configure your keys:
    echo    copy .env.local.example .env.local
    echo.
    echo 🔧 Required configurations:
    echo    - Web3Auth Client ID
    echo    - WalletConnect Project ID
    echo    - Alchemy API Key
    echo    - Flow contract addresses
    echo.
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Start development server
echo 🌐 Starting Next.js development server...
echo ✅ Dashboard: http://localhost:3000/dashboard
echo 🎮 Game: http://localhost:3000/game/beauty-contest
echo 📊 API: http://localhost:3000/api/game/results

npm run dev