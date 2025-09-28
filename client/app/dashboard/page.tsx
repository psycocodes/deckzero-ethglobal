import PlayerDashboard from "@/components/PlayerDashboard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Player Dashboard - DeckZero",
  description: "View your game stats, NFT collection, and Flow rewards",
};

export default function DashboardPage() {
  return <PlayerDashboard />;
}