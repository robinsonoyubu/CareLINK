import { Header } from "@/components/layout/header";
import { Metadata } from "next";
import Link from "next/link";
import { Heart, Shield, Award, Users, Target, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us | careLINK by RAFFATI",
  description: "RAFFATI Healthcare — connecting quality healthcare professionals to every home across Nigeria and beyond.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-[#0F4C81]">
            care<span className="text-[#22C55E]">LINK</span>
            <span className="text-xs text-[#64748B] font-normal ml-1">by RAFFATI</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/services" className="text-sm text-[#64748B] hover:text-[#0F4C81]">Services</Link>
            <Link href="/contact" className="text-sm text-[#64748B] hover:text-[#0F4C81]">Contact</Link>
            <Link href="/login" className="text-sm bg-[#0F4C81] text-white px-4 py-2 rounded-lg hover:bg-[#0F4C81]/90">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#0F4C81] to-[#1a6eb5] py-20 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">About RAFFATI Healthcare</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Nigeria’s premier healthcare workforce management platform — connecting quality care to every home.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-semibold text-[#22C55E] uppercase tracking-wider mb-3">Our Mission</p>
              <h2 className="text-3xl font-bold text-[#0F172A] mb-6">
                Transforming Healthcare Delivery Across Nigeria
              </h2>
              <p className="text-[#64748B] leading-relaxed mb-4">
                RAFFATI Healthcare was founded on a simple but powerful belief: every Nigerian family deserves access to professional, compassionate healthcare — in their home, at their convenience.
              </p>
              <p className="text-[#64748B] leading-relaxed mb-4">
                We bridge the gap between skilled healthcare professionals and the families, hospitals, and organisations that need them. Through our proprietary careLINK platform, we manage every aspect of the care journey — from matching and deployment to performance monitoring and payroll.
              </p>
              <p className="text-[#64748B] leading-relaxed">
                Only RAFFATI admin deploys staff. We maintain complete control over every placement, ensuring the highest standards of care and accountability.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {[
                { icon: Heart, label: "Patient-First Care", desc: "Every decision centres on patient safety and wellbeing", color: "text-rose-500", bg: "bg-rose-50" },
                { icon: Shield, label: "Full Accountability", desc: "We own every deployment from match to completion", color: "text-[#0F4C81]", bg: "bg-[#EBF4FF]" },
                { icon: Award, label: "Verified Professionals", desc: "Every professional is vetted, credentialed and trained", color: "text-[#F59E0B]", bg: "bg-amber-50" },
                { icon: Globe, label: "National Reach", desc: "Serving Lagos, Abuja, Port Harcourt and beyond", color: "text-[#22C55E]", bg: "bg-green-50" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-gray-100 p-5">
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.bg} mb-3`}>
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <h3 className="text-sm font-semibold text-[#0F172A] mb-1">{item.label}</h3>
                  <p className="text-xs text-[#64748B]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#F8FAFC] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {[
              { value: "500+", label: "Verified Professionals" },
              { value: "2,000+", label: "Care Deployments" },
              { value: "15+", label: "States Covered" },
              { value: "98%", label: "Client Satisfaction" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-bold text-[#0F4C81] mb-1">{s.value}</p>
                <p className="text-sm text-[#64748B]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-[#0F172A] mb-4">Our Leadership</h2>
          <p className="text-[#64748B] mb-12">A team of healthcare and technology experts dedicated to revolutionising care delivery in Nigeria.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { name: "Dr. Adaeze Raffati", title: "Founder & CEO", initials: "AR" },
              { name: "Chukwuemeka Obi", title: "Chief Operations Officer", initials: "CO" },
              { name: "Fatima Abubakar", title: "Head of Clinical Standards", initials: "FA" },
            ].map((member) => (
              <div key={member.name} className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-[#0F4C81] text-white flex items-center justify-center text-xl font-bold mb-4">
                  {member.initials}
                </div>
                <h3 className="font-semibold text-[#0F172A]">{member.name}</h3>
                <p className="text-sm text-[#64748B]">{member.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0F4C81] py-16 text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">Join the careLINK Network</h2>
          <p className="text-blue-100 mb-8">Whether you are a healthcare professional or an organisation seeking care solutions, we have a place for you.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="bg-white text-[#0F4C81] font-semibold px-8 py-3 rounded-xl hover:bg-gray-50 transition-colors">
              Register as Professional
            </Link>
            <Link href="/contact" className="border border-white/40 text-white font-semibold px-8 py-3 rounded-xl hover:bg-white/10 transition-colors">
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0F172A] py-8 text-center text-[#64748B] text-sm">
        <p>© {new Date().getFullYear()} RAFFATI Healthcare. All rights reserved.</p>
      </footer>
    </div>
  );
}
