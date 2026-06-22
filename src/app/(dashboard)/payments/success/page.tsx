"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type VerifyResult = { ok: boolean; amount?: number; error?: string };

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reference) { setLoading(false); return; }
    fetch(`/api/payments/verify?reference=${reference}`)
      .then((r) => r.json())
      .then((d: VerifyResult) => { setResult(d); setLoading(false); })
      .catch(() => { setResult({ ok: false, error: "Verification failed" }); setLoading(false); });
  }, [reference]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#0F4C81]" />
        <p className="text-sm text-[#64748B]">Verifying your payment…</p>
      </div>
    );
  }

  const success = result?.ok !== false;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 gap-6">
      {success ? (
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-[#22C55E]" />
        </div>
      ) : (
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
          <XCircle className="h-10 w-10 text-red-500" />
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-[#0F172A] mb-2">
          {success ? "Payment Successful" : "Payment Failed"}
        </h2>
        <p className="text-sm text-[#64748B] max-w-sm">
          {success
            ? "Your payment has been confirmed. Your booking is now active."
            : result?.error ?? "We could not verify your payment. Please contact support if the issue persists."}
        </p>
      </div>

      <div className="flex gap-3">
        <Button asChild>
          <Link href="/clients/bookings">View Bookings</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
