import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Earn History" };

const REASON: Record<string, string> = { ad_reward: "Advert completed", withdrawal: "Withdrawal", withdrawal_reversal: "Withdrawal returned", adjustment: "Adjustment" };

export default async function EarnHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: withdrawals }, { data: ledger }] = await Promise.all([
    supabase.from("withdrawals").select("id, reference, coins, amount, account_name, account_masked, status, failure_reason, requested_at, processed_at").eq("profile_id", user.id).order("requested_at", { ascending: false }),
    supabase.from("coin_ledger").select("id, delta, reason, created_at").eq("profile_id", user.id).order("created_at", { ascending: false }).limit(200),
  ]);

  return (
    <div className="animate-fade-in">
      <Header title="Earn History" subtitle="Adverts, coins and withdrawals" />
      <div className="p-4 md:p-6 space-y-4 max-w-3xl">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Withdrawals</CardTitle></CardHeader>
          <CardContent>
            {(withdrawals ?? []).length === 0 ? <p className="text-sm text-[#64748B]">No withdrawals yet.</p> : (
              <ul className="divide-y divide-[#F1F5F9]">
                {(withdrawals ?? []).map((w) => (
                  <li key={w.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>
                      <span className="font-mono">{w.reference}</span> · {w.coins} coins · {formatCurrency(Number(w.amount))}
                      <span className="block text-xs text-[#94A3B8]">{w.account_name} {w.account_masked} · {formatDateTime(w.requested_at)}{w.failure_reason ? ` · ${w.failure_reason}` : ""}</span>
                    </span>
                    <Badge variant={w.status === "successful" ? "completed" : w.status === "failed" ? "cancelled" : "pending"}>{w.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Coins</CardTitle></CardHeader>
          <CardContent>
            {(ledger ?? []).length === 0 ? <p className="text-sm text-[#64748B]">No coin activity yet.</p> : (
              <ul className="divide-y divide-[#F1F5F9]">
                {(ledger ?? []).map((l) => (
                  <li key={l.id} className="py-2 flex justify-between text-sm">
                    <span>{REASON[l.reason] ?? l.reason}<span className="block text-xs text-[#94A3B8]">{formatDateTime(l.created_at)}</span></span>
                    <span className={l.delta > 0 ? "text-green-700 font-semibold" : "text-[#374151] font-semibold"}>{l.delta > 0 ? `+${l.delta}` : l.delta}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
