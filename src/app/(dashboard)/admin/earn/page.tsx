import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CampaignForm, EarnSettingsForm, PayoutVerifyButton, WithdrawalActions } from "@/components/admin/admin-actions";
import { requireRghAdmin } from "@/lib/medlink/admin";
import { formatCurrency, formatDateTime, isoFromNow } from "@/lib/utils";

export const metadata = { title: "Earn governance" };

export default async function AdminEarnPage() {
  const { supabase } = await requireRghAdmin();
  const since = isoFromNow(-864e5);
  const [{ data: settings }, { data: withdrawals }, { data: accounts }, { data: campaigns }, { data: heavy }] = await Promise.all([
    supabase.from("earn_settings").select("*").eq("id", 1).single(),
    supabase.from("withdrawals").select("*").eq("status", "processing").order("requested_at"),
    supabase.from("payout_accounts").select("profile_id, account_name, account_number, updated_at, profile:profiles(full_name, email)").eq("is_verified", false),
    supabase.from("ad_campaigns").select("id, name, advertiser, category, completions, is_active").order("created_at", { ascending: false }),
    supabase.from("ad_impressions").select("profile_id, status").gte("started_at", since).limit(5000),
  ]);

  // Simple fraud signal: many rejected/started-but-not-finished impressions in 24h.
  const perUser = new Map<string, { total: number; rejected: number }>();
  for (const i of heavy ?? []) {
    const r = perUser.get(i.profile_id) ?? { total: 0, rejected: 0 };
    r.total++; if (i.status !== "completed") r.rejected++;
    perUser.set(i.profile_id, r);
  }
  const suspicious = [...perUser.entries()].filter(([, v]) => v.total >= 30 || v.rejected >= 10);

  return (
    <div className="animate-fade-in">
      <Header title="Earn governance" subtitle="Coin rate, OPay payouts, advert campaigns and abuse signals" />
      <div className="p-4 md:p-6 space-y-5">
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">Settings</CardTitle></CardHeader>
          <CardContent>{settings && <EarnSettingsForm settings={{ naira_per_coin: settings.naira_per_coin != null ? Number(settings.naira_per_coin) : null, withdrawals_enabled: settings.withdrawals_enabled, daily_ad_cap_per_user: settings.daily_ad_cap_per_user, min_withdrawal_coins: settings.min_withdrawal_coins }} />}</CardContent></Card>

        <Card><CardHeader className="pb-2"><CardTitle className="text-base">Withdrawals processing ({withdrawals?.length ?? 0})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(withdrawals ?? []).map((w) => (
              <div key={w.id} className="flex flex-wrap items-center justify-between gap-2 text-sm border-b border-[#F1F5F9] pb-2">
                <span><span className="font-mono">{w.reference}</span> · {w.coins} coins · <strong>{formatCurrency(Number(w.amount))}</strong> → {w.account_name} {w.account_masked}
                  <span className="block text-xs text-[#64748B]">Requested {formatDateTime(w.requested_at)}</span></span>
                <WithdrawalActions id={w.id} />
              </div>
            ))}
            {(withdrawals ?? []).length === 0 && <p className="text-sm text-[#64748B]">None.</p>}
          </CardContent></Card>

        <Card><CardHeader className="pb-2"><CardTitle className="text-base">OPay accounts to verify</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {((accounts ?? []) as unknown as { profile_id: string; account_name: string; account_number: string; profile: { full_name: string; email: string } | null }[]).map((a) => (
              <div key={a.profile_id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{a.account_name} · <span className="font-mono">{a.account_number}</span><span className="block text-xs text-[#64748B]">MedLINK user: {a.profile?.full_name} ({a.profile?.email})</span></span>
                <PayoutVerifyButton profileId={a.profile_id} />
              </div>
            ))}
            {(accounts ?? []).length === 0 && <p className="text-sm text-[#64748B]">None.</p>}
          </CardContent></Card>

        <Card><CardHeader className="pb-2"><CardTitle className="text-base">Abuse signals (24h)</CardTitle></CardHeader>
          <CardContent>
            {suspicious.length === 0 ? <p className="text-sm text-[#64748B]">Nothing unusual.</p> : suspicious.map(([pid, v]) => (
              <p key={pid} className="text-sm"><span className="font-mono text-xs">{pid}</span> — {v.total} ad starts, {v.rejected} not completed/rejected</p>
            ))}
          </CardContent></Card>

        <Card><CardHeader className="pb-2"><CardTitle className="text-base">Campaigns</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <CampaignForm />
            {(campaigns ?? []).map((c) => (
              <div key={c.id} className="flex justify-between text-sm"><span>{c.name} · {c.advertiser} · {c.category}</span><span>{c.completions} completions <Badge variant={c.is_active ? "active" : "cancelled"}>{c.is_active ? "live" : "off"}</Badge></span></div>
            ))}
          </CardContent></Card>
      </div>
    </div>
  );
}
