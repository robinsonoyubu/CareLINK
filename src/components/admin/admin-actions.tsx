"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

async function send(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = (await res.json().catch(() => ({}))) as { error?: unknown };
  if (!res.ok) toast.error(typeof d.error === "string" ? d.error : "Action failed");
  return res.ok;
}

const NEXT: Record<string, { status: string; label: string }[]> = {
  submitted: [{ status: "under_review", label: "Start review" }],
  under_review: [{ status: "rgh_verification", label: "Send to RGH verification" }],
  rgh_verification: [{ status: "verified", label: "Verify" }],
  rejected: [{ status: "under_review", label: "Reopen" }],
  verified: [{ status: "under_review", label: "Re-review" }],
};

export function ApplicationActions({ professionalId, status }: { professionalId: string; status: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  async function go(next: string) {
    setBusy(true);
    const ok = await send(`/api/professionals/${professionalId}/application`, "PATCH", { status: next, note: note || undefined });
    setBusy(false);
    if (ok) { setNote(""); router.refresh(); }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {(NEXT[status] ?? []).map((n) => <Button key={n.status} size="sm" loading={busy} onClick={() => go(n.status)}>{n.label}</Button>)}
      {status !== "verified" && status !== "rejected" && (
        <>
          <Input placeholder="Reason (required to reject)" value={note} onChange={(e) => setNote(e.target.value)} className="h-9 w-56" />
          <Button size="sm" variant="outline" disabled={note.trim().length < 3} loading={busy} onClick={() => go("rejected")}>Reject</Button>
        </>
      )}
    </div>
  );
}

export function EarnSettingsForm({ settings }: { settings: { naira_per_coin: number | null; withdrawals_enabled: boolean; daily_ad_cap_per_user: number; min_withdrawal_coins: number } }) {
  const router = useRouter();
  const [rate, setRate] = useState(settings.naira_per_coin?.toString() ?? "");
  const [enabled, setEnabled] = useState(settings.withdrawals_enabled);
  const [cap, setCap] = useState(String(settings.daily_ad_cap_per_user));
  async function save() {
    if (enabled && !(Number(rate) > 0)) { toast.error("Set a coin-to-cash rate before enabling withdrawals"); return; }
    const supabase = createClient();
    const { error } = await supabase.from("earn_settings").update({
      naira_per_coin: rate ? Number(rate) : null, withdrawals_enabled: enabled, daily_ad_cap_per_user: Number(cap), updated_at: new Date().toISOString(),
    }).eq("id", 1);
    if (error) toast.error(error.message); else { toast.success("Saved"); router.refresh(); }
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
      <div className="space-y-1"><Label>₦ per coin</Label><Input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
      <div className="space-y-1"><Label>Daily ad cap / user</Label><Input type="number" value={cap} onChange={(e) => setCap(e.target.value)} /></div>
      <label className="flex items-center gap-2 text-sm pb-2"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />Withdrawals open</label>
      <Button onClick={save}>Save</Button>
      <p className="sm:col-span-4 text-xs text-[#64748B]">Minimum withdrawal: {settings.min_withdrawal_coins} coins. Withdrawals stay closed until a rate is set.</p>
    </div>
  );
}

export function WithdrawalActions({ id }: { id: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  async function mark(status: "successful" | "failed") {
    if (await send(`/api/earn/withdrawals/${id}`, "PATCH", status === "failed" ? { status, reason } : { status })) router.refresh();
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => mark("successful")}>Mark paid</Button>
      <Input placeholder="Failure reason" value={reason} onChange={(e) => setReason(e.target.value)} className="h-9 w-44" />
      <Button size="sm" variant="outline" disabled={reason.trim().length < 3} onClick={() => mark("failed")}>Mark failed</Button>
    </div>
  );
}

export function PayoutVerifyButton({ profileId }: { profileId: string }) {
  const router = useRouter();
  return <Button size="sm" onClick={async () => { if (await send("/api/earn/payout-account", "PATCH", { profile_id: profileId, verified: true })) router.refresh(); }}>Verify name match</Button>;
}

export function CampaignForm() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", advertiser: "", category: "", headline: "", body: "", click_url: "", min_view_seconds: "15", daily_cap_per_user: "3" });
  async function save() {
    const supabase = createClient();
    const { error } = await supabase.from("ad_campaigns").insert({
      ...f, body: f.body || null, click_url: f.click_url || null, min_view_seconds: Number(f.min_view_seconds), daily_cap_per_user: Number(f.daily_cap_per_user),
    });
    if (error) toast.error(error.message); else { toast.success("Campaign live"); router.refresh(); }
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
      {(["name", "advertiser", "category", "headline"] as const).map((k) => (
        <div key={k} className="space-y-1"><Label className="capitalize">{k}</Label><Input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
      ))}
      <div className="space-y-1 sm:col-span-2"><Label>Body</Label><Input value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></div>
      <div className="space-y-1"><Label>Min view (s)</Label><Input type="number" value={f.min_view_seconds} onChange={(e) => setF({ ...f, min_view_seconds: e.target.value })} /></div>
      <div className="space-y-1"><Label>Daily cap / user</Label><Input type="number" value={f.daily_cap_per_user} onChange={(e) => setF({ ...f, daily_cap_per_user: e.target.value })} /></div>
      <div className="space-y-1 sm:col-span-3"><Label>Click URL</Label><Input value={f.click_url} onChange={(e) => setF({ ...f, click_url: e.target.value })} /></div>
      <Button disabled={!f.name || !f.advertiser || !f.category || !f.headline} onClick={save}>Add campaign</Button>
      <p className="sm:col-span-4 text-xs text-[#64748B]">Moderate categories. Do not run ads that target health conditions.</p>
    </div>
  );
}

export function ModerationActions({ reportId, postId }: { reportId: string; postId: string | null }) {
  const router = useRouter();
  async function act(remove: boolean) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (remove && postId) await supabase.from("gist_posts").update({ moderation_status: "removed" }).eq("id", postId);
    const { error } = await supabase.from("gist_reports").update({ status: remove ? "actioned" : "dismissed", reviewed_by: user?.id }).eq("id", reportId);
    if (error) toast.error(error.message); else router.refresh();
  }
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="destructive" onClick={() => act(true)}>Remove post</Button>
      <Button size="sm" variant="outline" onClick={() => act(false)}>Dismiss</Button>
    </div>
  );
}

export function ProviderOnboardForm() {
  const router = useRouter();
  const [f, setF] = useState({ kind: "hospital", name: "", city: "", state: "Lagos", address: "", phone: "", owner_email: "", is_emergency_partner: false });
  async function save() {
    if (await send("/api/admin/providers", "POST", f)) { toast.success("Provider created"); setF({ ...f, name: "", address: "", phone: "", owner_email: "" }); router.refresh(); }
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
      <div className="space-y-1"><Label>Type</Label>
        <select className="flex h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
          <option value="hospital">Hospital</option><option value="diagnostic">Diagnostic</option><option value="pharmacy">Pharmacy</option><option value="ambulance">Ambulance & paramedics</option>
        </select></div>
      <div className="space-y-1 sm:col-span-2"><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div className="space-y-1"><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
      <div className="space-y-1 sm:col-span-2"><Label>Address</Label><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
      <div className="space-y-1"><Label>City</Label><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
      <div className="space-y-1"><Label>State</Label><Input value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} /></div>
      <div className="space-y-1 sm:col-span-2"><Label>Staff account email (becomes provider owner)</Label><Input type="email" value={f.owner_email} onChange={(e) => setF({ ...f, owner_email: e.target.value })} /></div>
      {f.kind === "ambulance" && <label className="flex items-center gap-2 text-sm pb-2"><input type="checkbox" checked={f.is_emergency_partner} onChange={(e) => setF({ ...f, is_emergency_partner: e.target.checked })} />Emergency partner</label>}
      <Button disabled={f.name.trim().length < 2} onClick={save}>Create provider</Button>
    </div>
  );
}

export function ProviderVerifyToggle({ id, verified, active }: { id: string; verified: boolean; active: boolean }) {
  const router = useRouter();
  async function update(p: Record<string, boolean>) {
    const supabase = createClient();
    const { error } = await supabase.from("service_providers").update(p).eq("id", id);
    if (error) toast.error(error.message); else router.refresh();
  }
  return (
    <div className="flex gap-2">
      <Button size="sm" variant={verified ? "outline" : "default"} onClick={() => update({ is_verified: !verified })}>{verified ? "Remove RGH Verified" : "Mark RGH Verified"}</Button>
      <Button size="sm" variant="ghost" onClick={() => update({ is_active: !active })}>{active ? "Deactivate" : "Activate"}</Button>
    </div>
  );
}
