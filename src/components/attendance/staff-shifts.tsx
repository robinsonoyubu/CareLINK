"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import { ClockFlow } from "./clock-flow";

type Shift = { id: string; starts_at: string; ends_at: string; status: string; site_name: string; org_name: string; duration_minutes: number | null; has_exceptions: boolean };

export function StaffShifts({ shifts, consented }: { shifts: Shift[]; consented: boolean }) {
  const [active, setActive] = useState<{ id: string; type: "clock_in" | "clock_out"; site: string } | null>(null);
  const [hasConsent, setHasConsent] = useState(consented);
  const [saving, setSaving] = useState(false);

  async function consent() {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const now = new Date().toISOString();
    const { error } = await supabase.from("privacy_consents").upsert([
      { profile_id: user?.id, consent: "facial_verification", granted: true, updated_at: now },
      { profile_id: user?.id, consent: "precise_location", granted: true, updated_at: now },
    ]);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setHasConsent(true);
  }

  if (!hasConsent) {
    return (
      <Card><CardContent className="p-5 space-y-3 text-sm">
        <p className="font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Before you clock in</p>
        <p>Secure attendance uses three checks together to prevent proxy and remote clock-ins:</p>
        <ul className="list-disc pl-5 space-y-1 text-[#374151]">
          <li><strong>Dynamic QR</strong> — you scan the short-lived code shown at your facility.</li>
          <li><strong>Precise location</strong> — read only at clock-in/out to confirm you are inside the facility boundary. We don&apos;t track you between.</li>
          <li><strong>Facial & liveness check</strong> — a live camera image compared with your enrolled reference. Biometric data is encrypted, access-restricted and kept only as long as the retention policy allows.</li>
        </ul>
        <p className="text-[#64748B]">If a check wrongly rejects you, your Attendance Admin can record a reviewed manual exception, and you can ask RGH for a review. Questions about your data: contact RGH.</p>
        <Button loading={saving} onClick={consent}>I understand and agree</Button>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-3">
      {active && <ClockFlow shiftId={active.id} eventType={active.type} siteName={active.site} onClose={() => setActive(null)} />}
      {shifts.length === 0 && <p className="py-12 text-center text-sm text-[#64748B]">No assigned shifts in the next two weeks.</p>}
      {shifts.map((s) => (
        <Card key={s.id}><CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-medium">{s.org_name} · {s.site_name}</p>
            <p className="text-xs text-[#64748B]">{formatDateTime(s.starts_at)} – {formatDateTime(s.ends_at)}</p>
            {s.duration_minutes != null && <p className="text-xs text-[#64748B]">Worked {Math.floor(s.duration_minutes / 60)}h {s.duration_minutes % 60}m</p>}
          </div>
          <div className="flex items-center gap-2">
            {s.has_exceptions && <Badge variant="accent">Exception</Badge>}
            <Badge variant={s.status === "completed" ? "completed" : s.status === "in_progress" ? "active" : s.status === "missed" ? "cancelled" : "pending"}>{s.status.replace("_", " ")}</Badge>
            {s.status === "scheduled" && <Button size="sm" onClick={() => setActive({ id: s.id, type: "clock_in", site: s.site_name })}>Clock in</Button>}
            {s.status === "in_progress" && <Button size="sm" onClick={() => setActive({ id: s.id, type: "clock_out", site: s.site_name })}>Clock out</Button>}
          </div>
        </CardContent></Card>
      ))}
    </div>
  );
}
