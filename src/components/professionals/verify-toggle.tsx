"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldX } from "lucide-react";

export function ProfessionalVerifyToggle({ professionalId, isVerified }: { professionalId: string; isVerified: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await fetch(`/api/professionals/${professionalId}/verify`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_verified: !isVerified }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button size="sm" variant={isVerified ? "outline" : "default"} loading={loading} onClick={toggle}>
      {isVerified ? <ShieldX className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
      {isVerified ? "Revoke Verification" : "Verify Professional"}
    </Button>
  );
}
