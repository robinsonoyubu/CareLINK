"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export type Campaign = {
  id: string; advertiser: string; headline: string; body: string | null; creative_url: string | null;
  click_url: string | null; min_view_seconds: number; placements: string[];
};

export type AdResult = { completed: boolean; coinAwarded: boolean; reason?: string | null };

/**
 * A clearly labelled advert. The server timestamps the start and decides on
 * completion whether a coin is due — the countdown here is only for the user.
 */
export function AdPlayer({ campaign, placement, gameSlug, onDone }: {
  campaign: Campaign; placement: "earn_feed" | "game_break" | "rewarded_game"; gameSlug?: string; onDone: (r: AdResult) => void;
}) {
  const [impression, setImpression] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(campaign.min_view_seconds);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const visibleSince = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      const supabase = createClient();
      const { data, error: e } = await supabase.rpc("start_ad_impression", { p_campaign: campaign.id, p_placement: placement, p_game: gameSlug ?? null });
      if (cancelled) return;
      if (e || !data) { setError("This advert is unavailable."); return; }
      setImpression(data);
      visibleSince.current = Date.now();
    }
    start();
    return () => { cancelled = true; };
  }, [campaign.id, placement, gameSlug]);

  useEffect(() => {
    if (!impression) return;
    const t = setInterval(() => {
      // Only count time while the tab is visible.
      if (document.visibilityState === "visible") setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [impression]);

  async function finish() {
    if (!impression) return;
    setFinishing(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("complete_ad_impression", { p_impression: impression });
    const r = (data ?? {}) as { status?: string; coin_awarded?: boolean; reason?: string | null };
    setFinishing(false);
    onDone({ completed: r.status === "completed", coinAwarded: !!r.coin_awarded, reason: r.reason });
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#64748B]">
        {error} <Button size="sm" variant="ghost" onClick={() => onDone({ completed: false, coinAwarded: false })}>Close</Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden" role="region" aria-label="Advertisement">
      <div className="flex items-center justify-between bg-[#F1F5F9] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
        <span>Advertisement · {campaign.advertiser}</span>
        <span aria-live="polite">{remaining > 0 ? `${remaining}s` : "Done"}</span>
      </div>
      <div className="p-4 space-y-2">
        {campaign.creative_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={campaign.creative_url} alt="" className="w-full max-h-56 object-cover rounded-lg" />
        )}
        <p className="font-semibold text-[#0F172A]">{campaign.headline}</p>
        {campaign.body && <p className="text-sm text-[#374151]">{campaign.body}</p>}
        {campaign.click_url && (
          <a href={campaign.click_url} target="_blank" rel="noopener noreferrer sponsored" className="text-sm text-[#0F4C81] underline">Learn more</a>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-[#F1F5F9] p-3">
        {placement !== "earn_feed" && remaining > 0 && (
          <Button size="sm" variant="ghost" onClick={() => onDone({ completed: false, coinAwarded: false })}>Skip</Button>
        )}
        <Button size="sm" disabled={remaining > 0 || !impression} loading={finishing} onClick={finish}>
          {remaining > 0 ? `Please wait ${remaining}s` : placement === "rewarded_game" ? "Claim reward" : "Continue"}
        </Button>
      </div>
    </div>
  );
}

export async function fetchCampaign(placement: string): Promise<Campaign | null> {
  const supabase = createClient();
  const { data } = await supabase.from("ad_campaigns")
    .select("id, advertiser, headline, body, creative_url, click_url, min_view_seconds, placements")
    .eq("is_active", true).contains("placements", [placement]).limit(10);
  const list = (data ?? []) as Campaign[];
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
}
