import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/react'
import { mainnet, arbitrum } from 'wagmi/chains'

const projectId = process.env.WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID'

const metadata = {
  name: 'DeckZero',
  description: 'A Web3 Alternate Reality Game',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://deckzero.vercel.app',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

const chains = [mainnet, arbitrum] as const
export const wagmiConfig = defaultWagmiConfig({ chains, projectId, metadata })
createWeb3Modal({ wagmiConfig, projectId })