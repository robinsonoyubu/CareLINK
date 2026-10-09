import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Header } from "@/components/layout/header";
import { GAMES } from "@/lib/medlink/games";
import { SnakeGame } from "@/components/games/snake";

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = GAMES.find((g) => g.slug === slug);
  if (!game) notFound();

  return (
    <div className="animate-fade-in">
      <Header title={game.title} subtitle={game.tagline} />
      <div className="p-4 md:p-6 space-y-4">
        <Link href="/earn" className="inline-flex items-center gap-1 text-sm text-[#64748B] hover:text-[#0F4C81]"><ChevronLeft className="h-4 w-4" />Earn</Link>
        {game.slug === "snake" ? <SnakeGame /> : (
          <p className="rounded-lg bg-[#F1F5F9] p-6 text-center text-sm text-[#64748B]">This game is in development.</p>
        )}
      </div>
    </div>
  );
}
