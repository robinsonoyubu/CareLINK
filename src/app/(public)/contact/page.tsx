"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Phone, Mail, Clock, Send, Check } from "lucide-react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", service: "", message: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSending(false);
    if (res.ok) setSent(true);
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-[#0F4C81]">
            care<span className="text-[#22C55E]">LINK</span>
            <span className="text-xs text-[#64748B] font-normal ml-1">by RAFFATI</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/about" className="text-sm text-[#64748B] hover:text-[#0F4C81]">About</Link>
            <Link href="/services" className="text-sm text-[#64748B] hover:text-[#0F4C81]">Services</Link>
            <Link href="/login" className="text-sm bg-[#0F4C81] text-white px-4 py-2 rounded-lg hover:bg-[#0F4C81]/90">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      <section className="bg-gradient-to-br from-[#0F4C81] to-[#1a6eb5] py-20 text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Get In Touch</h1>
          <p className="text-xl text-blue-100">Request a service, enquire about joining our team, or just say hello.</p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Contact info */}
            <div>
              <h2 className="text-2xl font-bold text-[#0F172A] mb-8">Contact Information</h2>
              <div className="space-y-6">
                {[
                  { icon: MapPin, label: "Head Office", value: "3 Broad Street, Lagos Island, Lagos State, Nigeria" },
                  { icon: Phone, label: "Phone", value: "+234 (0) 800 RAFFATI" },
                  { icon: Mail, label: "Email", value: "hello@raffati.com" },
                  { icon: Clock, label: "Hours", value: "Monday – Friday: 8am – 6pm\nSaturday: 9am – 2pm\nEmergency: 24/7" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EBF4FF] flex-shrink-0">
                      <item.icon className="h-5 w-5 text-[#0F4C81]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">{item.label}</p>
                      <p className="text-sm text-[#64748B] whitespace-pre-line">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 rounded-2xl bg-[#F8FAFC] p-6">
                <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Business Enquiries</h3>
                <p className="text-sm text-[#64748B]">
                  For hospital staffing contracts, corporate wellness programmes, or large-scale deployment, contact our partnerships team at{" "}
                  <a href="mailto:partnerships@raffati.com" className="text-[#0F4C81] hover:underline">partnerships@raffati.com</a>.
                </p>
              </div>
            </div>

            {/* Form */}
            <div>
              <h2 className="text-2xl font-bold text-[#0F172A] mb-8">Send a Message</h2>
              {sent ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <Check className="h-8 w-8 text-[#22C55E]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Message Sent!</h3>
                  <p className="text-sm text-[#64748B] max-w-xs">
                    Thank you for reaching out. A member of our team will respond within 24 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#374151] mb-1.5">Full Name *</label>
                      <input
                        required
                        type="text"
                        placeholder="Amaka Okonkwo"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#374151] mb-1.5">Phone</label>
                      <input
                        type="tel"
                        placeholder="+234 800 000 0000"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-1.5">Email *</label>
                    <input
                      required
                      type="email"
                      placeholder="amaka@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-1.5">Service Interest</label>
                    <select
                      value={form.service}
                      onChange={(e) => setForm({ ...form, service: e.target.value })}
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81] bg-white"
                    >
                      <option value="">Select a service...</option>
                      <option>Home Care</option>
                      <option>Nursing Services</option>
                      <option>Caregiver</option>
                      <option>Physiotherapy</option>
                      <option>Hospital Staffing</option>
                      <option>Outsourcing</option>
                      <option>Join as Professional</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-1.5">Message *</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Tell us about your care needs or enquiry..."
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81] resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full bg-[#0F4C81] text-white font-semibold py-3 rounded-xl hover:bg-[#0F4C81]/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    <Send className="h-4 w-4" />
                    {sending ? "Sending..." : "Send Message"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#0F172A] py-8 text-center text-[#64748B] text-sm">
        <p>© {new Date().getFullYear()} RAFFATI Healthcare. All rights reserved.</p>
      </footer>
    </div>
  );
}
