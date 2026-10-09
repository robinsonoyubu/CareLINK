"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Maximize2, LocateFixed, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

type Site = { id: string; name: string; lat: number; lng: number; radius_m: number; max_accuracy_m: number; qr_ttl_seconds: number; is_active: boolean };
type Staff = { id: string; professional_id: string; facility_status: string; facility_verified_at: string | null; name: string; profession: string; rgh_status: string };
type Shift = { id: string; professional_id: string; site_id: string; starts_at: string; ends_at: string; status: string; has_exceptions: boolean; duration_minutes: number | null };
type Event = { id: string; shift_id: string; professional_id: string; event_type: string; server_ts: string; outcome: string; qr_result: string; geofence_result: string; face_result: string; distance_m: number | null; rejection_reasons: string[]; exception_reason: string | null; supporting_note: string | null; flagged: boolean; admin_id: string | null };
type Member = { id: string; profile_id: string; member_role: string; name: string };

const select = "flex h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm";

function QrDisplay({ site }: { site: Site }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    async function refresh() {
      const res = await fetch("/api/attendance/qr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site_id: site.id }) });
      if (cancelled) return;
      if (!res.ok) { toast.error("Could not generate QR"); timer = setTimeout(refresh, 10_000); return; }
      const d = (await res.json()) as { token: string; expires_at: number; refresh_in_ms: number };
      setDataUrl(await QRCode.toDataURL(d.token, { margin: 1, width: 480, errorCorrectionLevel: "M" }));
      setExpiresAt(d.expires_at);
      timer = setTimeout(refresh, d.refresh_in_ms);
    }
    refresh();
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { cancelled = true; clearTimeout(timer); clearInterval(tick); };
  }, [site.id]);

  return (
    <div id="qr-display" className="flex flex-col items-center gap-3 rounded-xl bg-white p-6">
      <p className="text-lg font-semibold">{site.name}</p>
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt="Attendance QR code" className="w-full max-w-sm aspect-square" />
      ) : <div className="w-full max-w-sm aspect-square animate-pulse rounded bg-[#F1F5F9]" />}
      <p className="text-sm text-[#64748B]" aria-live="polite">Refreshes automatically · valid {Math.max(0, Math.round((expiresAt - now) / 1000))}s</p>
      <p className="text-xs text-[#94A3B8]">Staff scan this in MedLINK → My Attendance. Codes expire quickly and can&apos;t be reused.</p>
      <Button size="sm" variant="outline" onClick={() => document.getElementById("qr-display")?.requestFullscreen?.()}><Maximize2 className="h-4 w-4" />Full screen</Button>
    </div>
  );
}

export function FacilityConsole({ orgId, isOrgAdmin }: { orgId: string; isOrgAdmin: boolean }) {
  const supabase = createClient();
  const [sites, setSites] = useState<Site[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [qrSite, setQrSite] = useState("");

  const load = useCallback(async () => {
    const [s, st, sh, ev, mem] = await Promise.all([
      supabase.from("facility_sites").select("*").eq("organization_id", orgId).order("name"),
      supabase.from("facility_staff").select("id, professional_id, facility_status, facility_verified_at, professional:professionals(profession, workforce_status, profile:profiles(full_name))").eq("organization_id", orgId),
      supabase.from("shifts").select("*").eq("organization_id", orgId).gte("starts_at", new Date(Date.now() - 7 * 864e5).toISOString()).order("starts_at", { ascending: false }).limit(200),
      supabase.from("attendance_events").select("*").eq("organization_id", orgId).order("server_ts", { ascending: false }).limit(200),
      supabase.from("organization_members").select("id, profile_id, member_role, profile:profiles(full_name)").eq("organization_id", orgId),
    ]);
    setSites((s.data ?? []) as Site[]);
    setStaff(((st.data ?? []) as unknown as { id: string; professional_id: string; facility_status: string; facility_verified_at: string | null; professional: { profession: string; workforce_status: string; profile: { full_name: string } | null } | null }[])
      .map((r) => ({ id: r.id, professional_id: r.professional_id, facility_status: r.facility_status, facility_verified_at: r.facility_verified_at, name: r.professional?.profile?.full_name ?? "Staff", profession: r.professional?.profession ?? "", rgh_status: r.professional?.workforce_status ?? "" })));
    setShifts((sh.data ?? []) as Shift[]);
    setEvents((ev.data ?? []) as Event[]);
    setMembers(((mem.data ?? []) as unknown as { id: string; profile_id: string; member_role: string; profile: { full_name: string } | null }[]).map((m) => ({ id: m.id, profile_id: m.profile_id, member_role: m.member_role, name: m.profile?.full_name ?? "Member" })));
  }, [orgId, supabase]);

  useEffect(() => { queueMicrotask(load); }, [load]);

  const nameOf = (pid: string) => staff.find((s) => s.professional_id === pid)?.name ?? "Staff";
  const siteOf = (sid: string) => sites.find((s) => s.id === sid)?.name ?? "Site";

  // ---- forms
  const [newShift, setNewShift] = useState({ professional_id: "", site_id: "", starts_at: "", ends_at: "" });
  async function createShift() {
    const { error } = await supabase.from("shifts").insert({
      organization_id: orgId, professional_id: newShift.professional_id, site_id: newShift.site_id,
      starts_at: new Date(newShift.starts_at).toISOString(), ends_at: new Date(newShift.ends_at).toISOString(),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Shift created"); setNewShift({ professional_id: "", site_id: "", starts_at: "", ends_at: "" }); load();
  }

  const [exc, setExc] = useState({ shift_id: "", event_type: "clock_in", reason: "camera_failure", supporting_note: "" });
  async function recordException() {
    const res = await fetch("/api/attendance/exception", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(exc) });
    const d = (await res.json()) as { error?: unknown };
    if (!res.ok) { toast.error(typeof d.error === "string" ? d.error : "Could not record exception"); return; }
    toast.success("Manual exception recorded and flagged for audit"); setExc({ ...exc, shift_id: "", supporting_note: "" }); load();
  }

  const [site, setSite] = useState({ name: "", lat: "", lng: "", radius_m: "150", max_accuracy_m: "50", qr_ttl_seconds: "30" });
  async function createSite() {
    const { error } = await supabase.from("facility_sites").insert({
      organization_id: orgId, name: site.name, lat: Number(site.lat), lng: Number(site.lng),
      radius_m: Number(site.radius_m), max_accuracy_m: Number(site.max_accuracy_m), qr_ttl_seconds: Number(site.qr_ttl_seconds),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Site added"); setSite({ ...site, name: "", lat: "", lng: "" }); load();
  }
  function useMyLocation() {
    navigator.geolocation?.getCurrentPosition((p) => setSite((s) => ({ ...s, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) })),
      () => toast.error("Couldn't read location"), { enableHighAccuracy: true });
  }

  async function updateStaff(id: string, patch: Record<string, unknown>) {
    const { error } = await supabase.from("facility_staff").update(patch).eq("id", id);
    if (error) toast.error(error.message); else load();
  }

  const [delegate, setDelegate] = useState({ email: "", member_role: "attendance_admin" });
  async function addMember() {
    const res = await fetch("/api/organizations/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organization_id: orgId, ...delegate }) });
    const d = (await res.json()) as { error?: unknown };
    if (!res.ok) { toast.error(typeof d.error === "string" ? d.error : "Could not add"); return; }
    toast.success("Access granted"); setDelegate({ ...delegate, email: "" }); load();
  }
  async function removeMember(id: string) {
    const res = await fetch("/api/organizations/members", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) load(); else toast.error("Could not remove");
  }

  const openShifts = shifts.filter((s) => s.status === "scheduled" || s.status === "in_progress");

  return (
    <Tabs defaultValue="qr" className="space-y-4">
      <TabsList className="flex flex-wrap h-auto">
        <TabsTrigger value="qr">QR display</TabsTrigger>
        <TabsTrigger value="shifts">Shifts</TabsTrigger>
        <TabsTrigger value="exceptions">Manual exception</TabsTrigger>
        <TabsTrigger value="audit">Audit log</TabsTrigger>
        {isOrgAdmin && <TabsTrigger value="staff">Workforce</TabsTrigger>}
        {isOrgAdmin && <TabsTrigger value="sites">Sites & geofence</TabsTrigger>}
        {isOrgAdmin && <TabsTrigger value="access">Delegation</TabsTrigger>}
      </TabsList>

      <TabsContent value="qr" className="space-y-3">
        <select className={`${select} max-w-sm`} value={qrSite} onChange={(e) => setQrSite(e.target.value)} aria-label="Site">
          <option value="">Choose a site to display</option>
          {sites.filter((s) => s.is_active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {qrSite && <QrDisplay key={qrSite} site={sites.find((s) => s.id === qrSite)!} />}
        {sites.length === 0 && <p className="text-sm text-[#64748B]">Add a site with its geofence first.</p>}
      </TabsContent>

      <TabsContent value="shifts" className="space-y-3">
        <Card><CardContent className="p-4 grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
          <div className="space-y-1"><Label>Staff</Label>
            <select className={select} value={newShift.professional_id} onChange={(e) => setNewShift({ ...newShift, professional_id: e.target.value })}>
              <option value="">Choose…</option>{staff.filter((s) => s.facility_status === "active").map((s) => <option key={s.professional_id} value={s.professional_id}>{s.name}</option>)}
            </select></div>
          <div className="space-y-1"><Label>Site</Label>
            <select className={select} value={newShift.site_id} onChange={(e) => setNewShift({ ...newShift, site_id: e.target.value })}>
              <option value="">Choose…</option>{sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></div>
          <div className="space-y-1"><Label>Starts</Label><Input type="datetime-local" value={newShift.starts_at} onChange={(e) => setNewShift({ ...newShift, starts_at: e.target.value })} /></div>
          <div className="space-y-1"><Label>Ends</Label><Input type="datetime-local" value={newShift.ends_at} onChange={(e) => setNewShift({ ...newShift, ends_at: e.target.value })} /></div>
          <Button disabled={!newShift.professional_id || !newShift.site_id || !newShift.starts_at || !newShift.ends_at} onClick={createShift}>Add shift</Button>
        </CardContent></Card>
        <ul className="space-y-2">
          {shifts.map((s) => (
            <li key={s.id} className="rounded-lg border border-[#E2E8F0] bg-white p-3 text-sm flex flex-wrap justify-between gap-2">
              <span>{nameOf(s.professional_id)} · {siteOf(s.site_id)}<span className="block text-xs text-[#64748B]">{formatDateTime(s.starts_at)} – {formatDateTime(s.ends_at)}{s.duration_minutes != null && ` · ${Math.floor(s.duration_minutes / 60)}h ${s.duration_minutes % 60}m`}</span></span>
              <span className="flex gap-2">{s.has_exceptions && <Badge variant="accent">Exception</Badge>}<Badge variant={s.status === "completed" ? "completed" : s.status === "in_progress" ? "active" : "pending"}>{s.status.replace("_", " ")}</Badge></span>
            </li>
          ))}
        </ul>
      </TabsContent>

      <TabsContent value="exceptions">
        <Card><CardContent className="p-4 space-y-3">
          <p className="text-sm text-[#64748B]">Use only when camera, GPS, device or connectivity fails, or after reviewing a false rejection. A supporting note is required; the event stays flagged in the audit log.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select className={select} value={exc.shift_id} onChange={(e) => setExc({ ...exc, shift_id: e.target.value })} aria-label="Shift">
              <option value="">Choose shift…</option>
              {openShifts.map((s) => <option key={s.id} value={s.id}>{nameOf(s.professional_id)} · {formatDateTime(s.starts_at)}</option>)}
            </select>
            <select className={select} value={exc.event_type} onChange={(e) => setExc({ ...exc, event_type: e.target.value })} aria-label="Event">
              <option value="clock_in">Clock in</option><option value="clock_out">Clock out</option>
            </select>
            <select className={select} value={exc.reason} onChange={(e) => setExc({ ...exc, reason: e.target.value })} aria-label="Reason">
              <option value="camera_failure">Camera failure</option><option value="gps_failure">GPS failure</option><option value="device_failure">Device failure</option>
              <option value="connectivity_failure">Connectivity failure</option><option value="false_rejection">Reviewed false rejection</option><option value="other">Other</option>
            </select>
          </div>
          <textarea rows={2} placeholder="Supporting note (who confirmed presence, what failed)" value={exc.supporting_note} onChange={(e) => setExc({ ...exc, supporting_note: e.target.value })}
            className="flex w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm" aria-label="Supporting note" />
          <Button disabled={!exc.shift_id || exc.supporting_note.trim().length < 10} onClick={recordException}>Record manual exception</Button>
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="audit">
        <div className="overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white">
          <table className="w-full text-xs">
            <thead className="bg-[#F8FAFC] text-left text-[#64748B]"><tr>
              {["Server time", "Staff", "Event", "Outcome", "QR", "Geofence", "Face", "Notes"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className={e.flagged ? "bg-amber-50/50" : ""}>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(e.server_ts)}</td>
                  <td className="px-3 py-2">{nameOf(e.professional_id)}</td>
                  <td className="px-3 py-2">{e.event_type.replace("_", " ")}</td>
                  <td className="px-3 py-2"><Badge variant={e.outcome === "accepted" ? "completed" : e.outcome === "rejected" ? "cancelled" : "accent"}>{e.outcome.replace("_", " ")}</Badge></td>
                  <td className="px-3 py-2">{e.qr_result}</td>
                  <td className="px-3 py-2">{e.geofence_result}{e.distance_m != null && ` (${e.distance_m}m)`}</td>
                  <td className="px-3 py-2">{e.face_result}</td>
                  <td className="px-3 py-2">{e.exception_reason ? `${e.exception_reason.replace(/_/g, " ")}: ${e.supporting_note}` : e.rejection_reasons.join(", ")}</td>
                </tr>
              ))}
              {events.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-[#64748B]">No attendance events yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-[#94A3B8]">Events are append-only and cannot be edited or deleted.</p>
      </TabsContent>

      {isOrgAdmin && (
        <TabsContent value="staff" className="space-y-2">
          <p className="text-sm text-[#64748B]">Staff are assigned by RGH. Verify each assignment on arrival and keep the facility status current.</p>
          {staff.length === 0 && <p className="text-sm text-[#64748B]">No staff assigned yet.</p>}
          {staff.map((s) => (
            <div key={s.id} className="rounded-lg border border-[#E2E8F0] bg-white p-3 text-sm flex flex-wrap items-center justify-between gap-2">
              <span>{s.name} <span className="text-[#64748B] capitalize">· {s.profession.replace(/_/g, " ")} · RGH: {s.rgh_status.replace(/_/g, " ")}</span></span>
              <span className="flex items-center gap-2">
                {s.facility_verified_at ? <Badge variant="verified">Facility verified</Badge>
                  : <Button size="sm" variant="outline" onClick={() => updateStaff(s.id, { facility_verified_at: new Date().toISOString() })}>Verify arrival</Button>}
                <select className="h-9 rounded-md border border-[#E2E8F0] px-2 text-sm" value={s.facility_status} onChange={(e) => updateStaff(s.id, { facility_status: e.target.value })} aria-label={`Facility status for ${s.name}`}>
                  <option value="active">Active</option><option value="on_leave">On Leave</option><option value="suspended">Suspended</option><option value="inactive">Inactive</option>
                </select>
              </span>
            </div>
          ))}
        </TabsContent>
      )}

      {isOrgAdmin && (
        <TabsContent value="sites" className="space-y-3">
          <Card><CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
            <div className="space-y-1 col-span-2"><Label>Site name</Label><Input value={site.name} onChange={(e) => setSite({ ...site, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Latitude</Label><Input value={site.lat} onChange={(e) => setSite({ ...site, lat: e.target.value })} /></div>
            <div className="space-y-1"><Label>Longitude</Label><Input value={site.lng} onChange={(e) => setSite({ ...site, lng: e.target.value })} /></div>
            <div className="space-y-1"><Label>Radius (m)</Label><Input type="number" value={site.radius_m} onChange={(e) => setSite({ ...site, radius_m: e.target.value })} /></div>
            <div className="space-y-1"><Label>Max GPS error (m)</Label><Input type="number" value={site.max_accuracy_m} onChange={(e) => setSite({ ...site, max_accuracy_m: e.target.value })} /></div>
            <div className="space-y-1"><Label>QR lifetime (s)</Label><Input type="number" value={site.qr_ttl_seconds} onChange={(e) => setSite({ ...site, qr_ttl_seconds: e.target.value })} /></div>
            <Button variant="outline" onClick={useMyLocation}><LocateFixed className="h-4 w-4" />Use my location</Button>
            <Button className="col-span-2 sm:col-span-4" disabled={!site.name || !site.lat || !site.lng} onClick={createSite}>Add site</Button>
          </CardContent></Card>
          {sites.map((s) => (
            <div key={s.id} className="rounded-lg border border-[#E2E8F0] bg-white p-3 text-sm flex flex-wrap justify-between gap-2">
              <span>{s.name}<span className="block text-xs text-[#64748B]">{s.lat.toFixed(5)}, {s.lng.toFixed(5)} · radius {s.radius_m}m · max error {s.max_accuracy_m}m · QR {s.qr_ttl_seconds}s</span></span>
              <Button size="sm" variant="ghost" onClick={async () => { await supabase.from("facility_sites").update({ is_active: !s.is_active }).eq("id", s.id); load(); }}>{s.is_active ? "Deactivate" : "Activate"}</Button>
            </div>
          ))}
        </TabsContent>
      )}

      {isOrgAdmin && (
        <TabsContent value="access" className="space-y-3">
          <p className="text-sm text-[#64748B]">An Attendance Admin can display QR codes, manage shifts and record exceptions — without full administrator access.</p>
          <Card><CardContent className="p-4 grid grid-cols-1 sm:grid-cols-[1fr,200px,auto] gap-2 items-end">
            <div className="space-y-1"><Label>Email of MedLINK user</Label><Input type="email" value={delegate.email} onChange={(e) => setDelegate({ ...delegate, email: e.target.value })} /></div>
            <div className="space-y-1"><Label>Role</Label>
              <select className={select} value={delegate.member_role} onChange={(e) => setDelegate({ ...delegate, member_role: e.target.value })}>
                <option value="attendance_admin">Attendance Admin</option><option value="org_admin">Facility Admin</option>
              </select></div>
            <Button disabled={!delegate.email.includes("@")} onClick={addMember}>Grant access</Button>
          </CardContent></Card>
          {members.map((m) => (
            <div key={m.id} className="rounded-lg border border-[#E2E8F0] bg-white p-3 text-sm flex items-center justify-between">
              <span>{m.name} · {m.member_role === "attendance_admin" ? "Attendance Admin" : "Facility Admin"}</span>
              <Button size="icon" variant="ghost" onClick={() => removeMember(m.id)} aria-label={`Remove ${m.name}`}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </TabsContent>
      )}
    </Tabs>
  );
}
