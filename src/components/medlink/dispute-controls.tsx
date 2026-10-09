"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { FileUpload } from "./file-upload";

export function DisputeReply({ disputeId }: { disputeId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(kind: "comment" | "evidence", value: string) {
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("dispute_events").insert({
      dispute_id: disputeId, actor_id: user?.id, kind, ...(kind === "comment" ? { body: value } : { evidence_url: value }),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setBody("");
    router.refresh();
  }

  return (
    <Card><CardContent className="p-4 space-y-3">
      <Label htmlFor="reply">Add information</Label>
      <textarea id="reply" rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000}
        className="flex w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm" />
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" loading={busy} disabled={!body.trim()} onClick={() => add("comment", body.trim())}>Send</Button>
        <FileUpload folder="dispute-evidence" label="Add evidence" onUploaded={(p) => add("evidence", p)} />
      </div>
    </CardContent></Card>
  );
}

const STATUSES = ["open", "under_review", "investigating", "awaiting_response", "resolved", "closed"] as const;

export function DisputeAdminControls({ disputeId, status, resolution }: { disputeId: string; status: string; resolution: string | null }) {
  const router = useRouter();
  const [next, setNext] = useState(status);
  const [res, setRes] = useState(resolution ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const r = await fetch(`/api/disputes/${disputeId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next, resolution: res.trim() || undefined, message: message.trim() || undefined }),
    });
    const data = (await r.json()) as { error?: unknown };
    setBusy(false);
    if (!r.ok) { toast.error(typeof data.error === "string" ? data.error : "Could not update"); return; }
    toast.success("Dispute updated");
    setMessage("");
    router.refresh();
  }

  return (
    <Card className="border-[#0F4C81]/30"><CardContent className="p-4 space-y-3">
      <p className="text-sm font-semibold text-[#0F4C81]">RGH review</p>
      <div className="space-y-1">
        <Label htmlFor="ds">Status</Label>
        <select id="ds" value={next} onChange={(e) => setNext(e.target.value)} className="flex h-10 rounded-md border border-[#E2E8F0] bg-white px-3 text-sm">
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="dr">Resolution (required to resolve or close)</Label>
        <textarea id="dr" rows={2} value={res} onChange={(e) => setRes(e.target.value)} className="flex w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="dm">Message to the complainant (optional)</Label>
        <textarea id="dm" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} className="flex w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm" />
      </div>
      <Button size="sm" loading={busy} onClick={save}>Save</Button>
    </CardContent></Card>
  );
}
