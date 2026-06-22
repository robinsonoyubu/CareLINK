"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Clock, CreditCard, ExternalLink } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

type Booking = {
  id: string;
  title: string;
  status: string;
  service_type: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  hourly_rate: number | null;
};

type Payment = {
  id: string;
  assignment_id: string;
  amount: number;
  status: string;
  payment_method: string;
  paid_at: string | null;
};

export default function ClientBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      setRole(profile?.role ?? "");

      // Get client or org id
      let assignmentQuery = supabase
        .from("assignments")
        .select("id, title, status, service_type, location, start_date, end_date, hourly_rate")
        .order("created_at", { ascending: false });

      if (profile?.role === "client") {
        const { data: client } = await supabase.from("clients").select("id").eq("profile_id", user.id).single();
        if (client) assignmentQuery = assignmentQuery.eq("client_id", client.id);
      } else if (profile?.role === "organization") {
        const { data: org } = await supabase.from("organizations").select("id").eq("profile_id", user.id).single();
        if (org) assignmentQuery = assignmentQuery.eq("organization_id", org.id);
      }

      const { data: b } = await assignmentQuery;
      const assignmentRows = (b as Booking[]) ?? [];
      setBookings(assignmentRows);

      // Fetch payments for these assignments
      if (assignmentRows.length > 0) {
        const ids = assignmentRows.map((a) => a.id);
        const { data: p } = await supabase
          .from("payments")
          .select("id, assignment_id, amount, status, payment_method, paid_at")
          .in("assignment_id", ids);
        setPayments((p as Payment[]) ?? []);
      }

      setLoading(false);
    }
    load();
  }, []);

  async function initiatePayment(assignmentId: string, amount: number) {
    setPayingId(assignmentId);
    const res = await fetch("/api/payments/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignment_id: assignmentId, amount, payment_method: "paystack" }),
    });
    const data = await res.json() as { authorization_url?: string; error?: string };
    setPayingId(null);
    if (data.authorization_url) {
      window.location.assign(data.authorization_url);
    }
  }

  const paymentMap = payments.reduce<Record<string, Payment>>((acc, p) => {
    if (!acc[p.assignment_id] || p.status === "paid") acc[p.assignment_id] = p;
    return acc;
  }, {});

  const statusColors: Record<string, "active" | "pending" | "completed" | "cancelled"> = {
    active: "active", pending: "pending", completed: "completed", cancelled: "cancelled",
  };

  return (
    <div className="animate-fade-in">
      <Header title="My Bookings" subtitle="Active and past care service bookings" />

      <div className="p-6 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-[#F1F5F9] animate-pulse" />
            ))}
          </div>
        ) : bookings.length > 0 ? (
          bookings.map((b) => {
            const payment = paymentMap[b.id];
            const isPaid = payment?.status === "paid";
            const needsPayment = b.status === "active" && !isPaid && b.hourly_rate;

            return (
              <Card key={b.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0F172A] mb-0.5">{b.title}</p>
                      <p className="text-xs text-[#64748B] capitalize">{b.service_type.replace(/_/g, " ")}</p>
                    </div>
                    <Badge variant={statusColors[b.status] ?? "default"} className="flex-shrink-0">{b.status}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-[#94A3B8] mb-4">
                    {b.location && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{b.location}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />{formatDate(b.start_date)}
                      {b.end_date && ` – ${formatDate(b.end_date)}`}
                    </span>
                    {b.hourly_rate && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />{formatCurrency(b.hourly_rate)}/hr
                      </span>
                    )}
                  </div>

                  {/* Payment section */}
                  <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between gap-3">
                    {payment ? (
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-[#94A3B8]" />
                        <span className="text-xs text-[#64748B]">
                          {isPaid
                            ? `Paid ${formatCurrency(payment.amount)}${payment.paid_at ? ` on ${formatDate(payment.paid_at)}` : ""}`
                            : `Payment ${payment.status}`}
                        </span>
                        <Badge variant={isPaid ? "completed" : payment.status === "failed" ? "cancelled" : "pending"}>
                          {payment.status}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-xs text-[#94A3B8]">No payment recorded</span>
                    )}

                    <div className="flex items-center gap-2">
                      {needsPayment && !isPaid && (
                        <Button
                          size="sm"
                          loading={payingId === b.id}
                          onClick={() => initiatePayment(b.id, (b.hourly_rate ?? 0))}
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Pay Now
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => window.location.assign(`/assignments/${b.id}`)}>
                        <ExternalLink className="h-3.5 w-3.5" />
                        Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-[#EBF4FF] flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-[#0F4C81]" />
            </div>
            <h3 className="text-base font-semibold text-[#0F172A] mb-1">No bookings yet</h3>
            <p className="text-sm text-[#64748B]">
              {role === "organization"
                ? "Your service requests and assignments will appear here."
                : "Your care assignments will appear here once a professional is deployed."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
