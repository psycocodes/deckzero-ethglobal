@echo off
echo 🎮 DeckZero Flow Contracts - Emulator Deployment
echo ===============================================

REM Check if Flow CLI is installed
where flow >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Flow CLI not found. Installing Flow CLI...
    echo.
    echo Please install Flow CLI manually:
    echo 1. Visit: https://developers.flow.com/tools/flow-cli/install
    echo 2. Download the Windows binary
    echo 3. Add to your PATH
    echo.
    pause
    exit /b 1
)

echo ✅ Flow CLI found

echo.
echo 🚀 Starting Flow emulator...
start /B flow emulator start --verbose

echo Waiting for emulator to start...
timeout /t 5 /nobreak > nul

echo.
echo 📦 Deploying contracts to emulator...
flow project deploy --network emulator

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Successfully deployed to emulator!
    echo.
    echo 📋 Contract Addresses (Emulator):
    echo GameRewards: 0xf8d6e0586b0a20c7
    echo TokenRewards: 0xf8d6e0586b0a20c7  
    echo PlayerProfile: 0xf8d6e0586b0a20c7
    echo.
    echo 📝 Update your .env.local with these addresses:
    echo NEXT_PUBLIC_FLOW_GAME_CONTRACT_ADDRESS=0xf8d6e0586b0a20c7
    echo NEXT_PUBLIC_FLOW_NFT_CONTRACT_ADDRESS=0xf8d6e0586b0a20c7
    echo NEXT_PUBLIC_FLOW_TOKEN_CONTRACT_ADDRESS=0xf8d6e0586b0a20c7
    echo.
    echo 🌐 Emulator running on: http://localhost:8080
) else (
    echo.
    echo ❌ Deployment failed. Check the output above for errors.
)

echo.
echo Press any key to stop emulator...
pause > nul
taskkill /F /IM flow.exe 2>nul