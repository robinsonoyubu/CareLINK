"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function CalendarSettings({ configured, connectedEmail, connected }: { configured: boolean; connected: boolean; connectedEmail: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function disconnect() {
    setBusy(true);
    const res = await fetch("/api/calendar/google/connect", { method: "DELETE" });
    setBusy(false);
    if (res.ok) { toast.success("Google Calendar disconnected"); router.refresh(); }
  }

  return (
    <Card className="max-w-2xl"><CardContent className="p-5 space-y-3">
      <p className="font-semibold flex items-center gap-2"><CalendarDays className="h-4 w-4" />Google Calendar</p>
      <p className="text-sm text-[#64748B]">
        After you authorise it, confirmed bookings are added to your Google Calendar with the provider/service, date and time, location,
        booking reference and instructions. Reschedules and cancellations update the event. MedLINK stays your primary booking record and
        Notifications remains your alert centre — Google Calendar is an extra reminder channel.
      </p>
      {!configured ? (
        <p className="text-sm text-amber-700">Google Calendar integration isn&apos;t enabled on this MedLINK deployment yet.</p>
      ) : connected ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-green-700">Connected{connectedEmail ? ` as ${connectedEmail}` : ""}</span>
          <Button variant="outline" loading={busy} onClick={disconnect}>Disconnect</Button>
        </div>
      ) : (
        <a href="/api/calendar/google/connect"><Button>Connect Google Calendar</Button></a>
      )}
    </CardContent></Card>
  );
}
