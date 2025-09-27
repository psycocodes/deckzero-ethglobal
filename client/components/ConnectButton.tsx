"use client";

import React, { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useRouter } from "next/navigation";
import WalletModal from "./WalletModal";
import { Wallet, User } from "lucide-react";

const ConnectButton: React.FC = () => {
  const { isConnected, address } = useWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleClick = () => {
    if (isConnected) {
      // If connected, navigate to dashboard
      router.push("/dashboard");
    } else {
      // If not connected, open modal
      setIsModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleModalConnect = (address: string) => {
    // TODO: Changed Later
    console.log(address)
    // Optionally update wallet state here
    setIsModalOpen(false);
  };

  return (
    <>
      <button
        onClick={handleClick}
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

      <WalletModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onConnect={handleModalConnect}
      />
    </>
  );
};

export default ConnectButton;
