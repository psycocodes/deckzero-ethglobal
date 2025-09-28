import EnhancedGameWrapper from "@/components/EnhancedGameWrapper";
import type { Metadata } from "next";
import { use } from "react";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export async function generateMetadata(props: {
  params: Params;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const gameId = (await props.params).slug;

  return {
    title: `Play ${gameId} - DeckZero`,
    description: `Play ${gameId} and earn Flow rewards and ENS badges!`,
  };
}

export default function GamePage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  const gameId = use(props.params).slug;
  return (
    <main className="w-screen h-screen bg-black">
      <div id="unity-container" className="w-full h-full">
        <EnhancedGameWrapper gameId={gameId} />
      </div>
    </main>
  );
}
