"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { toast } from "sonner";
import { QrCode, MapPin, ScanFace, CheckCircle2, XCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Step = "qr" | "location" | "face" | "submitting" | "done";

function useCamera(facingMode: "environment" | "user", active: boolean) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (video.current) { video.current.srcObject = stream; await video.current.play(); }
      } catch {
        setError("Camera unavailable. Allow camera access, or ask your Attendance Admin to record a manual exception.");
      }
    })();
    return () => { cancelled = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, [facingMode, active]);
  return { video, error };
}

/** Open shift → Scan current QR → Validate geofence → Facial/liveness check → Submit → Server records event. */
export function ClockFlow({ shiftId, eventType, siteName, onClose }: {
  shiftId: string; eventType: "clock_in" | "clock_out"; siteName: string; onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("qr");
  const [token, setToken] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [result, setResult] = useState<{ accepted: boolean; reasons?: string[] } | null>(null);
  const scanCanvas = useRef<HTMLCanvasElement>(null);

  const { video: qrVideoRef, error: qrError } = useCamera("environment", step === "qr");
  const { video: faceVideoRef, error: faceError } = useCamera("user", step === "face");

  // Decode QR frames from the live camera.
  useEffect(() => {
    if (step !== "qr") return;
    let raf = 0;
    const scan = () => {
      const v = qrVideoRef.current; const c = scanCanvas.current;
      if (v && c && v.readyState >= 2) {
        c.width = v.videoWidth; c.height = v.videoHeight;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(v, 0, 0);
          const img = ctx.getImageData(0, 0, c.width, c.height);
          const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
          if (code?.data?.startsWith("MLQR1.")) { setToken(code.data); setStep("location"); return; }
        }
      }
      raf = requestAnimationFrame(scan);
    };
    raf = requestAnimationFrame(scan);
    return () => cancelAnimationFrame(raf);
  }, [step, qrVideoRef]);

  // Precise location for the geofence check.
  useEffect(() => {
    if (step !== "location") return;
    if (!navigator.geolocation) { queueMicrotask(() => setLocError("Location is not available on this device.")); return; }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        if (pos.coords.accuracy <= 50) { navigator.geolocation.clearWatch(id); setStep("face"); }
      },
      () => setLocError("Couldn't read your location. Enable location services and retry."),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [step]);

  async function captureAndSubmit() {
    const v = faceVideoRef.current;
    if (!v || v.readyState < 2 || !token || !location) return;
    const c = document.createElement("canvas");
    c.width = Math.min(640, v.videoWidth); c.height = Math.round((c.width / v.videoWidth) * v.videoHeight);
    c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
    const live = c.toDataURL("image/jpeg", 0.85).split(",")[1];
    setStep("submitting");
    const res = await fetch("/api/attendance/clock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shift_id: shiftId, event_type: eventType, qr_token: token, location, live_capture: live,
        device: { platform: navigator.platform?.slice(0, 60), app_version: "web" },
      }),
    });
    const data = (await res.json()) as { accepted?: boolean; reasons?: string[]; error?: unknown };
    if (res.ok && data.accepted) { setResult({ accepted: true }); toast.success(eventType === "clock_in" ? "Clocked in" : "Clocked out"); router.refresh(); }
    else {
      const reasons = data.reasons ?? (typeof data.error === "string" ? [data.error] : (data.error as { reasons?: string[] })?.reasons) ?? ["Attendance could not be recorded."];
      setResult({ accepted: false, reasons });
    }
    setStep("done");
  }

  const steps: { key: Step; label: string; icon: typeof QrCode }[] = [
    { key: "qr", label: "Scan QR", icon: QrCode }, { key: "location", label: "Location", icon: MapPin }, { key: "face", label: "Face check", icon: ScanFace },
  ];
  const order = ["qr", "location", "face", "submitting", "done"];

  return (
    <Card className="border-[#0F4C81]/30"><CardContent className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold">{eventType === "clock_in" ? "Clock in" : "Clock out"} · {siteName}</p>
        <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
      </div>
      <ol className="flex gap-2 text-xs">
        {steps.map((s) => {
          const Icon = s.icon;
          const done = order.indexOf(step) > order.indexOf(s.key);
          return (
            <li key={s.key} className={cn("flex items-center gap-1 rounded-full px-2.5 py-1", step === s.key ? "bg-[#0F4C81] text-white" : done ? "bg-green-50 text-green-700" : "bg-[#F1F5F9] text-[#64748B]")}>
              <Icon className="h-3.5 w-3.5" />{s.label}
            </li>
          );
        })}
      </ol>

      {step === "qr" && (
        <div className="space-y-2">
          <p className="text-sm text-[#64748B]">Point your camera at the QR code on the facility screen. Codes refresh every few seconds — screenshots won&apos;t work.</p>
          {qrError ? <p className="text-sm text-red-700">{qrError}</p> : (
            <video ref={qrVideoRef} playsInline muted className="w-full max-w-sm aspect-square object-cover rounded-lg bg-black" />
          )}
          <canvas ref={scanCanvas} className="hidden" />
        </div>
      )}

      {step === "location" && (
        <div className="space-y-2 text-sm">
          <p>Checking you are inside the facility boundary…</p>
          {location && <p className="text-[#64748B]">GPS accuracy ±{Math.round(location.accuracy)} m{location.accuracy > 50 && " — waiting for a better fix. Move near a window or outdoors."}</p>}
          {locError && <p className="text-red-700">{locError}</p>}
          {location && location.accuracy > 50 && <Button size="sm" variant="outline" onClick={() => setStep("face")}>Continue anyway</Button>}
        </div>
      )}

      {step === "face" && (
        <div className="space-y-2">
          <p className="text-sm text-[#64748B]">Look at the camera. This is a live check — uploaded photos are not accepted.</p>
          {faceError ? <p className="text-sm text-red-700">{faceError}</p> : (
            <video ref={faceVideoRef} playsInline muted className="w-full max-w-sm aspect-[3/4] object-cover rounded-lg bg-black -scale-x-100" />
          )}
          <Button onClick={captureAndSubmit} disabled={!!faceError}><Camera className="h-4 w-4" />Verify & submit</Button>
        </div>
      )}

      {step === "submitting" && <p className="text-sm">Verifying with the server…</p>}

      {step === "done" && result && (
        result.accepted ? (
          <p className="flex items-center gap-2 text-green-700 font-medium"><CheckCircle2 className="h-5 w-5" />Recorded at server time.</p>
        ) : (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-red-700 font-medium"><XCircle className="h-5 w-5" />Not recorded</p>
            <ul className="list-disc pl-5 text-sm text-[#374151]">{result.reasons?.map((r) => <li key={r}>{r}</li>)}</ul>
            <p className="text-xs text-[#64748B]">The attempt is logged. If your camera, GPS or device failed, ask your Attendance Admin to record a manual exception. If you think the face check was wrong, ask for a review.</p>
            <Button size="sm" variant="outline" onClick={() => { setResult(null); setToken(null); setStep("qr"); }}>Try again</Button>
          </div>
        )
      )}
    </CardContent></Card>
  );
}
