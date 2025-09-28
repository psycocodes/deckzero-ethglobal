import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/react'
import { mainnet, arbitrum, sepolia } from 'wagmi/chains'

// Get project ID from environment
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

if (!projectId) {
  console.warn('⚠️ NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID not found in environment variables')
  console.warn('💡 Please add your WalletConnect Project ID to .env.local')
} 


const metadata = {
  name: 'DeckZero',
  description: 'A Web3 Blockchain Gaming Platform',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://deckzero.vercel.app',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

// Include both mainnet and testnet chains
const chains = [mainnet, sepolia, arbitrum] as const
export const wagmiConfig = defaultWagmiConfig({ 
  chains, 
  projectId: projectId || 'demo-project-id', // Fallback for development
  metadata 
})

// Only create Web3Modal if we have a valid project ID
if (projectId) {
  createWeb3Modal({ wagmiConfig, projectId })
} else if (typeof window !== 'undefined') {
  console.error('❌ WalletConnect Project ID missing - wallet connection disabled')
  console.error('🔧 Please set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in your .env.local file')
}