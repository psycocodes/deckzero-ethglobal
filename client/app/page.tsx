"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { Wallet, User } from "lucide-react";

import Balatro from "@/components/Balatro";

export default function Home() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { open } = useWeb3Modal();

  // Removed automatic redirect - user stays on landing page
  // useEffect(() => {
  //   if (isConnected) {
  //     router.push("/dashboard");
  //   }
  // }, [isConnected, router]);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-12">
      
      <div
        style={{
          width: "100%",
          height: "100vh",
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
        }}
      >
        <Balatro
          isRotate={false}
          mouseInteraction={true}
          pixelFilter={700}
          color1={"#000000"}
          color2={"#676767ff"}
          color3={"#5c5c5cff"}
        />
      </div>
      <div className="z-50">
          <div className="text-center z-10 relative">
            <h1 className="text-10xl md:text-6xl lg:text-8xl font-bold text-white tracking-wider font-[CSCalebMono]">
              DeckZero
            </h1>
            <p className="text-5xl md:text-2xl lg:text-3xl text-gray-300 mt-6 tracking-widest font-mono">
              REALITY ON CHAIN
            </p>
          </div>
          
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
                  router.push("/dashboard");
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
      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/40 pointer-events-none" />
    </div>
  );
}
