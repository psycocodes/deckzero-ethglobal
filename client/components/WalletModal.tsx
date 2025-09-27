"use client";

import React, { useState } from "react";
import { X, Wallet, ExternalLink, Copy, Check } from "lucide-react";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (address: string) => void;
}

const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  onConnect,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum === "undefined") {
        throw new Error(
          "MetaMask is not installed. Please install MetaMask to continue."
        );
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length > 0) {
        const address = accounts[0];
        setConnectedAddress(address);
        onConnect(address);
      }
    } catch (err: unknown) {
      let message = "Failed to connect wallet";
      if (typeof err === "object" && err && "message" in err) {
        message = (err as { message?: string }).message || message;
      } else if (typeof err === "string") {
        message = err;
      }
      setError(message);
    } finally {
      setIsConnecting(false);
    }
  };

  const copyToClipboard = async () => {
    if (connectedAddress) {
      try {
        await navigator.clipboard.writeText(connectedAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy address:", err);
      }
    }
  };

  const openEtherscan = () => {
    if (connectedAddress) {
      window.open(`https://etherscan.io/address/${connectedAddress}`, "_blank");
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white font-[CSCalebMono]">
            {connectedAddress ? "Wallet Connected" : "Connect Wallet"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        {!connectedAddress ? (
          <div className="space-y-4">
            <p className="text-gray-300 text-sm">
              Connect your wallet to access the dashboard and start playing.
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="w-full bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg p-4 text-white font-[CSCalebMono] transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
            >
              {isConnecting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Wallet size={20} />
              )}
              {isConnecting ? "Connecting..." : "Connect MetaMask"}
            </button>

            <div className="text-center">
              <p className="text-gray-400 text-xs">
                Don&apos;t have a wallet?{" "}
                <a
                  href="https://metamask.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Install MetaMask
                </a>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Connected Address</span>
                <button
                  onClick={copyToClipboard}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <p className="text-white font-mono text-sm break-all">
                {formatAddress(connectedAddress)}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={openEtherscan}
                className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg p-3 text-blue-400 font-[CSCalebMono] transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
              >
                <ExternalLink size={16} />
                View on Etherscan
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg p-3 text-green-400 font-[CSCalebMono] transition-all duration-300 hover:scale-105"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletModal;
