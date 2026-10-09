"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";

export function ChatButton({ providerId, bookingId, serviceId, label, ...props }: {
  providerId: string; bookingId?: string; serviceId?: string; label: string;
} & Omit<ButtonProps, "onClick">) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    const res = await fetch("/api/chats/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_id: providerId, booking_id: bookingId, service_id: serviceId }),
    });
    const data = (await res.json()) as { id?: string; error?: unknown };
    setLoading(false);
    if (!res.ok || !data.id) {
      toast.error(typeof data.error === "string" ? data.error : "Could not start chat");
      return;
    }
    router.push(`/chats?c=${data.id}`);
  }

  return (
    <Button variant="outline" size="sm" loading={loading} onClick={start} {...props}>
      <MessageSquare className="h-4 w-4" /> {label}
    </Button>
  );
}
