# Quick Deploy to Emulator Script

echo "🚀 Starting Flow Emulator Deployment"

# Start emulator in background
Start-Process -NoNewWindow flow -ArgumentList "emulator","start","--verbose"

# Wait for emulator to start
Start-Sleep 5

# Deploy to emulator 
flow project deploy --network emulator

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Successfully deployed to emulator!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Contract Addresses:" -ForegroundColor Yellow
    Write-Host "GameRewards: 0xf8d6e0586b0a20c7" -ForegroundColor Cyan
    Write-Host "TokenRewards: 0xf8d6e0586b0a20c7" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Update your .env.local:" -ForegroundColor Yellow
    Write-Host "NEXT_PUBLIC_FLOW_GAME_CONTRACT_ADDRESS=0xf8d6e0586b0a20c7" -ForegroundColor Gray
    Write-Host "NEXT_PUBLIC_FLOW_NFT_CONTRACT_ADDRESS=0xf8d6e0586b0a20c7" -ForegroundColor Gray
    Write-Host "NEXT_PUBLIC_FLOW_TOKEN_CONTRACT_ADDRESS=0xf8d6e0586b0a20c7" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🌐 Flow Emulator running on: http://localhost:8080" -ForegroundColor Green
} else {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")