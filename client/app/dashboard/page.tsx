'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wallet, Copy, Check, ExternalLink, Gamepad2, Trophy, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useAccount, useDisconnect } from 'wagmi';

export default function Dashboard() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);


  const { disconnect } = useDisconnect();


  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    } else if (address) {
      setWalletAddress(address);
    }
  }, [isConnected, address, router]);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyToClipboard = async () => {
    if (walletAddress) {
      try {
        await navigator.clipboard.writeText(walletAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy address:', err);
      }
    }
  };

  const openEtherscan = () => {
    if (walletAddress) {
      window.open(`https://etherscan.io/address/${walletAddress}`, '_blank');
    }
  };

  const disconnectWallet = () => {
    disconnect();
  };

  if (!walletAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/"
              className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-[CSCalebMono]">Back to Home</span>
            </Link>
            
            <h1 className="text-xl font-bold text-white font-[CSCalebMono]">
              Dashboard
            </h1>

            <button
              onClick={disconnectWallet}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 font-[CSCalebMono] transition-all duration-300 hover:scale-105"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Wallet Info Card */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Wallet size={24} className="text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white font-[CSCalebMono]">
                Wallet Information
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-2">Connected Address</label>
                <div className="flex items-center gap-3">
                  <p className="text-white font-mono text-sm bg-gray-900/50 px-3 py-2 rounded-lg flex-1">
                    {formatAddress(walletAddress)}
                  </p>
                  <button
                    onClick={copyToClipboard}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="Copy address"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                  <button
                    onClick={openEtherscan}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="View on Etherscan"
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm block mb-2">Network</label>
                <p className="text-white font-[CSCalebMono] bg-gray-900/50 px-3 py-2 rounded-lg">
                  Ethereum Mainnet
                </p>
              </div>
            </div>
          </div>

          {/* Game Access Card */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Gamepad2 size={24} className="text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white font-[CSCalebMono]">
                Game Access
              </h2>
            </div>

            <div className="space-y-4">
              <p className="text-gray-300 text-sm">
                Your wallet is connected and ready to play. Access your games and manage your assets.
              </p>

              <div className="space-y-3">
                <Link
                  href="/game/beauty-contest"
                  className="block w-full bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg p-4 text-white font-[CSCalebMono] transition-all duration-300 hover:scale-105 text-center"
                >
                  Play Beauty Contest
                </Link>

                <div className="grid grid-cols-2 gap-3">
                  <button className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg p-3 text-blue-400 font-[CSCalebMono] transition-all duration-300 hover:scale-105">
                    View Assets
                  </button>
                  <button className="bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg p-3 text-purple-400 font-[CSCalebMono] transition-all duration-300 hover:scale-105">
                    Game History
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Gamepad2 size={20} className="text-green-400" />
              <h3 className="text-gray-400 text-sm font-[CSCalebMono]">Games Played</h3>
            </div>
            <p className="text-2xl font-bold text-white font-[CSCalebMono]">0</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy size={20} className="text-yellow-400" />
              <h3 className="text-gray-400 text-sm font-[CSCalebMono]">Total Wins</h3>
            </div>
            <p className="text-2xl font-bold text-white font-[CSCalebMono]">0</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp size={20} className="text-blue-400" />
              <h3 className="text-gray-400 text-sm font-[CSCalebMono]">Win Rate</h3>
            </div>
            <p className="text-2xl font-bold text-white font-[CSCalebMono]">0%</p>
          </div>
        </div>
      </div>
    </div>
  );
}