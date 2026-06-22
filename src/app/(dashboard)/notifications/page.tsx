"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, Check, CheckCheck, Briefcase, Star, MessageSquare, AlertCircle } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  link_url: string | null;
};

const iconMap: Record<string, React.ReactNode> = {
  assignment: <Briefcase className="h-4 w-4 text-[#0F4C81]" />,
  performance: <Star className="h-4 w-4 text-[#F59E0B]" />,
  message: <MessageSquare className="h-4 w-4 text-[#22C55E]" />,
  alert: <AlertCircle className="h-4 w-4 text-red-500" />,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, message, is_read, created_at, link_url")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setNotifications((data as Notification[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function markAllRead() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("profile_id", user.id)
      .eq("is_read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function markRead(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="animate-fade-in">
      <Header
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        actions={
          unreadCount > 0 ? (
            <Button size="sm" variant="outline" onClick={markAllRead}>
              <CheckCheck className="h-4 w-4 mr-1.5" />
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <div className="p-6 max-w-2xl space-y-2">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-[#F1F5F9] animate-pulse" />
            ))}
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((n) => (
            <Card
              key={n.id}
              className={`transition-all cursor-pointer hover:shadow-sm ${!n.is_read ? "border-[#0F4C81]/20 bg-[#EBF4FF]/40" : ""}`}
              onClick={() => {
                if (!n.is_read) markRead(n.id);
                if (n.link_url) window.location.href = n.link_url;
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${!n.is_read ? "bg-[#EBF4FF]" : "bg-[#F1F5F9]"}`}>
                    {iconMap[n.type] ?? <Bell className="h-4 w-4 text-[#94A3B8]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-medium ${!n.is_read ? "text-[#0F172A]" : "text-[#374151]"}`}>
                        {n.title}
                      </p>
                      {!n.is_read && (
                        <span className="h-2 w-2 rounded-full bg-[#0F4C81] flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-[#94A3B8] mt-1">{formatRelativeTime(n.created_at)}</p>
                  </div>
                  {n.is_read && <Check className="h-4 w-4 text-[#CBD5E1] flex-shrink-0 mt-0.5" />}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-[#EBF4FF] flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-[#0F4C81]" />
            </div>
            <h3 className="text-base font-semibold text-[#0F172A] mb-1">No notifications</h3>
            <p className="text-sm text-[#64748B]">You&apos;re all caught up. New notifications will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
