'use client';

import React, { useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { wagmiConfig } from '@/lib/web';

type Props = {
  children: React.ReactNode;
};

const projectId = process.env.WALLET_CONNECT_PROJECT_ID || '';


export default function Web3Providers({ children }: Props) {
  useEffect(() => {
    if (!projectId) return;
    createWeb3Modal({
      wagmiConfig,
      projectId,
      enableAnalytics: false,
      defaultChain: mainnet,
      themeMode: 'dark',
    });
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      {children}
    </WagmiProvider>
  );
}


