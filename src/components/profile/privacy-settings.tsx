"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

const ITEMS = [
  { key: "precise_location", label: "Precise location", desc: "Used only at attendance clock-in/out (geofence) and when you share it for an emergency." },
  { key: "facial_verification", label: "Facial verification", desc: "Live face + liveness check for staff attendance. Turning this off means attendance needs a manual exception." },
  { key: "marketing_ads", label: "Personalised adverts in Earn", desc: "Never based on your health information. Off = only contextual adverts." },
  { key: "calendar_sync", label: "Google Calendar sync", desc: "Adds confirmed bookings to your Google Calendar. Manage the connection in the Calendar tab." },
] as const;

export function PrivacySettings({ consents }: { consents: Record<string, boolean> }) {
  const [state, setState] = useState(consents);

  async function toggle(key: string, granted: boolean) {
    setState((s) => ({ ...s, [key]: granted }));
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("privacy_consents").upsert({ profile_id: user?.id, consent: key, granted, updated_at: new Date().toISOString() });
    if (error) { toast.error("Couldn't save"); setState((s) => ({ ...s, [key]: !granted })); }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Privacy controls</CardTitle></CardHeader>
        <CardContent className="divide-y divide-[#F1F5F9]">
          {ITEMS.map((i) => (
            <label key={i.key} className="flex items-start justify-between gap-4 py-3 cursor-pointer">
              <span><span className="block text-sm font-medium">{i.label}</span><span className="block text-xs text-[#64748B]">{i.desc}</span></span>
              <input type="checkbox" className="mt-1 h-4 w-4" checked={!!state[i.key]} onChange={(e) => toggle(i.key, e.target.checked)} />
            </label>
          ))}
        </CardContent>
      </Card>
      <Card><CardContent className="p-4 text-sm text-[#374151] space-y-2">
        <p className="font-medium">How MedLINK handles sensitive data</p>
        <ul className="list-disc pl-5 space-y-1 text-[#64748B]">
          <li>NIN, government IDs, licences, certificates and guarantor documents are visible only to authorised RGH personnel. Others see only non-sensitive details and the RGH Verified badge.</li>
          <li>Facial verification data and precise location are encrypted, access-restricted, logged and kept only for the defined retention period.</li>
          <li>Access is role-based and audited. You can ask RGH to review a decision (e.g. a false attendance rejection) or to access or delete your data.</li>
        </ul>
      </CardContent></Card>
    </div>
  );
}
