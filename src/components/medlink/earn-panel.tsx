"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Coins, PlayCircle, Wallet, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdPlayer, fetchCampaign, type Campaign } from "./ad-player";
import { canWithdraw, coinsToNaira, maskAccountNumber, withdrawalProgress } from "@/lib/medlink/earn";
import { formatCurrency } from "@/lib/utils";

const REJECT_TEXT: Record<string, string> = {
  daily_cap_reached: "You've reached today's advert limit. Come back tomorrow.",
  campaign_daily_cap_reached: "You've already earned from this advert today.",
  campaign_cap_reached: "This campaign has ended.",
  viewed_too_briefly: "The advert wasn't viewed long enough.",
};

export function EarnPanel({ balance: initialBalance, minCoins, nairaPerCoin, withdrawalsEnabled, account, processing }: {
  balance: number; minCoins: number; nairaPerCoin: number | null; withdrawalsEnabled: boolean;
  account: { account_name: string; account_number: string; is_verified: boolean } | null; processing: boolean;
}) {
  const router = useRouter();
  const [balance, setBalance] = useState(initialBalance);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loadingAd, setLoadingAd] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  async function watch() {
    setLoadingAd(true);
    const c = await fetchCampaign("earn_feed");
    setLoadingAd(false);
    if (!c) { toast.info("No adverts available right now. Check back later."); return; }
    setCampaign(c);
  }

  async function withdraw() {
    setWithdrawing(true);
    const res = await fetch("/api/earn/withdraw", { method: "POST" });
    const data = (await res.json()) as { reference?: string; error?: unknown };
    setWithdrawing(false);
    setConfirm(false);
    if (!res.ok) { toast.error(typeof data.error === "string" ? data.error : "Withdrawal failed"); return; }
    toast.success(`Withdrawal ${data.reference} is processing`);
    setBalance(0);
    router.refresh();
  }

  const cash = coinsToNaira(balance, nairaPerCoin);
  const eligible = canWithdraw(balance, minCoins);
  const blocker = !withdrawalsEnabled || nairaPerCoin == null ? "Withdrawals open once RGH publishes the coin-to-cash rate."
    : !account ? "Add your OPay account to withdraw."
    : !account.is_verified ? "Your OPay account is awaiting RGH verification."
    : processing ? "A withdrawal is already processing."
    : !eligible ? `Reach ${minCoins} coins to withdraw.` : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card><CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#64748B]">Wallet balance</p>
            <p className="text-3xl font-bold text-[#0F172A] flex items-center gap-2"><Coins className="h-7 w-7 text-amber-500" />{balance}</p>
            {cash != null && <p className="text-sm text-[#64748B]">≈ {formatCurrency(cash)}</p>}
          </div>
          <Button disabled={!!blocker} onClick={() => setConfirm(true)}><Wallet className="h-4 w-4" />Withdraw</Button>
        </div>
        <div className="space-y-1">
          <Progress value={withdrawalProgress(balance, minCoins)} aria-label="Progress to withdrawal" />
          <p className="text-xs text-[#64748B]">{blocker ?? "You can withdraw your full balance now."}</p>
        </div>
        <p className="text-xs text-[#94A3B8]">1 completed eligible advert = 1 coin. Daily limits apply. Duplicate, repeated or automated views don&apos;t earn.</p>
      </CardContent></Card>

      <Card><CardContent className="p-5 space-y-3">
        {campaign ? (
          <AdPlayer campaign={campaign} placement="earn_feed" onDone={(r) => {
            setCampaign(null);
            if (r.coinAwarded) { setBalance((b) => b + 1); toast.success("+1 coin"); }
            else if (r.reason) toast.info(REJECT_TEXT[r.reason] ?? "No coin for this view.");
          }} />
        ) : (
          <>
            <p className="font-semibold">Watch an advert</p>
            <p className="text-sm text-[#64748B]">Adverts are labelled and moderated. We never target ads using your health information.</p>
            <Button loading={loadingAd} onClick={watch}><PlayCircle className="h-4 w-4" />Watch & earn 1 coin</Button>
          </>
        )}
      </CardContent></Card>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm withdrawal</DialogTitle>
            <DialogDescription>Your full balance will be paid to your verified OPay account and your wallet will reset to 0.</DialogDescription>
          </DialogHeader>
          {account && (
            <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-[#64748B]">Account name</dt><dd className="font-medium">{account.account_name}</dd>
              <dt className="text-[#64748B]">OPay number</dt><dd className="font-mono">{maskAccountNumber(account.account_number)}</dd>
              <dt className="text-[#64748B]">Coins</dt><dd>{balance}</dd>
              <dt className="text-[#64748B]">Amount</dt><dd className="font-semibold">{cash != null ? formatCurrency(cash) : "—"}</dd>
            </dl>
          )}
          <p className="text-xs text-[#64748B]">Target processing time is about one hour, subject to verification.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button loading={withdrawing} onClick={withdraw}>Confirm withdrawal</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PayoutAccountForm({ account }: { account: { account_name: string; account_number: string; is_verified: boolean } | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(!account);
  const [name, setName] = useState(account?.account_name ?? "");
  const [number, setNumber] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const res = await fetch("/api/earn/payout-account", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ account_name: name.trim(), account_number: number.trim() }) });
    const data = (await res.json()) as { error?: unknown };
    setBusy(false);
    if (!res.ok) { toast.error(typeof data.error === "string" ? data.error : "Check the account details"); return; }
    toast.success("Saved — RGH will verify the account name");
    setEditing(false);
    router.refresh();
  }

  return (
    <Card><CardContent className="p-5 space-y-3">
      <p className="font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4" />OPay payout account</p>
      {!editing && account ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>{account.account_name} · <span className="font-mono">{maskAccountNumber(account.account_number)}</span> · {account.is_verified ? <span className="text-green-700">Verified</span> : <span className="text-amber-700">Awaiting verification</span>}</span>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Change</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr,180px,auto] gap-2 items-end">
          <div className="space-y-1"><Label htmlFor="an">Account name (as on OPay)</Label><Input id="an" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="ac">OPay number</Label><Input id="ac" inputMode="numeric" maxLength={10} value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))} /></div>
          <Button loading={busy} disabled={name.trim().length < 3 || number.length !== 10} onClick={save}>Save</Button>
          {account && <p className="sm:col-span-3 text-xs text-amber-700">Changing your account requires re-verification before your next withdrawal.</p>}
        </div>
      )}
    </CardContent></Card>
  );
}
