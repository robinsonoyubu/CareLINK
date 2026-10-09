"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type VerifyResult = { ok: boolean; amount?: number; error?: string };

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#0F4C81]" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(!!reference);

  useEffect(() => {
    if (!reference) return;
    async function verify() {
      try {
        const r = await fetch(`/api/payments/verify?reference=${encodeURIComponent(reference!)}`);
        setResult((await r.json()) as VerifyResult);
      } catch {
        setResult({ ok: false, error: "Verification failed" });
      }
      setLoading(false);
    }
    verify();
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
        <Link href="/bookings"><Button>View Bookings</Button></Link>
        <Link href="/dashboard"><Button variant="outline">Home</Button></Link>
      </div>
    </div>
  );
}
