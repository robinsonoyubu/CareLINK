import Link from "next/link";
import { redirect } from "next/navigation";
import { Gamepad2, History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EarnPanel, PayoutAccountForm } from "@/components/medlink/earn-panel";
import { GAMES } from "@/lib/medlink/games";

export const metadata = { title: "Earn" };

export default async function EarnPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: wallet }, { data: settings }, { data: account }, { count: processing }] = await Promise.all([
    supabase.from("coin_wallets").select("balance, cycle").eq("profile_id", user.id).maybeSingle(),
    supabase.from("earn_settings").select("min_withdrawal_coins, naira_per_coin, withdrawals_enabled").eq("id", 1).maybeSingle(),
    supabase.from("payout_accounts").select("account_name, account_number, is_verified").eq("profile_id", user.id).maybeSingle(),
    supabase.from("withdrawals").select("id", { count: "exact", head: true }).eq("profile_id", user.id).eq("status", "processing"),
  ]);

  return (
    <div className="animate-fade-in">
      <Header title="Earn" subtitle="Watch adverts, earn coins, withdraw to OPay — and play games"
        actions={<Link href="/earn/history"><Button size="sm" variant="outline"><History className="h-4 w-4" />History</Button></Link>} />
      <div className="p-4 md:p-6 space-y-6">
        <EarnPanel
          balance={wallet?.balance ?? 0}
          minCoins={settings?.min_withdrawal_coins ?? 100}
          nairaPerCoin={settings?.naira_per_coin != null ? Number(settings.naira_per_coin) : null}
          withdrawalsEnabled={!!settings?.withdrawals_enabled}
          account={account}
          processing={(processing ?? 0) > 0}
        />
        <PayoutAccountForm account={account} />

        <section aria-labelledby="games-h" className="space-y-3">
          <h2 id="games-h" className="text-base font-semibold flex items-center gap-2"><Gamepad2 className="h-5 w-5" />Games</h2>
          <p className="text-sm text-[#64748B]">Short games with ads only at natural breaks. Game perks (extra lives, hints) are separate from your Earn wallet.</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {GAMES.map((g) => (
              <li key={g.slug}>
                <Card className="h-full"><CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{g.title}</p>
                    <Badge variant={g.status === "playable" ? "available" : "outline"}>{g.status === "playable" ? "Play now" : "Coming soon"}</Badge>
                  </div>
                  <p className="text-sm text-[#64748B]">{g.tagline}</p>
                  {g.status === "playable" && <Link href={`/earn/games/${g.slug}`}><Button size="sm">Play</Button></Link>}
                </CardContent></Card>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
