"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const TRANSITIONS: Record<string, { label: string; next: string; variant: "default" | "outline" | "destructive" }[]> = {
  pending:   [{ label: "Activate",  next: "active",    variant: "default" }, { label: "Cancel", next: "cancelled", variant: "destructive" }],
  active:    [{ label: "Complete",  next: "completed", variant: "default" }, { label: "Cancel", next: "cancelled", variant: "destructive" }],
  completed: [],
  cancelled: [{ label: "Reopen",   next: "pending",   variant: "outline" }],
};

export function AssignmentStatusActions({ assignmentId, currentStatus }: { assignmentId: string; currentStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const actions = TRANSITIONS[currentStatus] ?? [];

  if (actions.length === 0) return null;

  async function changeStatus(next: string) {
    setLoading(next);
    await fetch(`/api/assignments/${assignmentId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {actions.map((a) => (
        <Button
          key={a.next}
          size="sm"
          variant={a.variant}
          loading={loading === a.next}
          onClick={() => changeStatus(a.next)}
        >
          {a.label}
        </Button>
      ))}
    </div>
  );
}
