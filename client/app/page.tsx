
'use client';

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { Wallet, User } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { open } = useWeb3Modal();

  useEffect(() => {
    if (isConnected) {
      router.push('/dashboard');
    }
  }, [isConnected, router]);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex flex-col items-center justify-center gap-12">
      <h1 className="text-4xl md:text-6xl lg:text-8xl font-bold text-white tracking-wider font-[CSCalebMono]">
        Cards of Fortune
      </h1>
      
      <div className="flex flex-col items-center gap-4">
        <Link
          href="/game/beauty-contest"
          className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white font-[CSCalebMono] transition-all duration-300 hover:scale-105"
        >
          Enter the Game
        </Link>
        
        <button
          onClick={() => {
            if (isConnected && address) {
              router.push('/dashboard');
            } else {
              open();
            }
          }}
          className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white font-[CSCalebMono] transition-all duration-300 hover:scale-105 flex items-center gap-3"
        >
          {isConnected ? (
            <>
              <User size={20} />
              {formatAddress(address!)}
            </>
          ) : (
            <>
              <Wallet size={20} />
              Connect Wallet
            </>
          )}
        </button>
      </div>
    </div>
  );
}
