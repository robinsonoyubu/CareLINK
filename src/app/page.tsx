import Link from "next/link";
import { ArrowRight, CheckCircle2, Star, Shield, Heart, Users, Building2, Stethoscope, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-[var(--font-sans,system-ui)]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-[#E2E8F0] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#0F4C81] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">cL</span>
              </div>
              <div>
                <p className="font-bold text-[#0F172A] text-sm leading-tight">careLINK</p>
                <p className="text-[#64748B] text-xs leading-tight">by RAFFATI</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-8">
              {["Services", "How It Works", "About", "Blog"].map((item) => (
                <Link
                  key={item}
                  href={`/${item.toLowerCase().replace(/\s+/g, "-")}`}
                  className="text-sm text-[#374151] hover:text-[#0F4C81] transition-colors font-medium"
                >
                  {item}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0F4C81] via-[#1260A8] to-[#0a3560] px-4 py-20 sm:py-28">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-[#22C55E] blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white/90 mb-6 border border-white/20">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                Nigeria&apos;s Premier Healthcare Staffing Platform
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
                Connecting{" "}
                <span className="text-[#22C55E]">Quality Care</span>
                {" "}to Every Home
              </h1>
              <p className="text-lg text-white/80 max-w-xl mb-8 leading-relaxed">
                careLINK by RAFFATI deploys verified nurses, caregivers, physiotherapists, and doctors to families, hospitals, and organizations across Nigeria.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
                <Link href="/register?role=client">
                  <Button size="xl" variant="secondary" className="w-full sm:w-auto">
                    Request a Caregiver
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/register?role=professional">
                  <Button size="xl" variant="outline" className="w-full sm:w-auto border-white/30 text-white bg-white/10 hover:bg-white/20">
                    Join as Professional
                  </Button>
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-6 justify-center lg:justify-start">
                {heroStats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-sm text-white/60">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-shrink-0 w-full max-w-sm">
              <div className="rounded-2xl bg-white shadow-2xl overflow-hidden">
                <div className="bg-[#0F4C81] px-5 py-4">
                  <p className="text-white font-semibold text-sm">Active Assignment</p>
                  <p className="text-white/60 text-xs mt-0.5">Home Care · Lagos Island</p>
                </div>
                <div className="p-5 space-y-4">
                  {mockAssignment.map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#EBF4FF] flex items-center justify-center text-lg">
                          {item.emoji}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#0F172A]">{item.name}</p>
                          <p className="text-xs text-[#64748B]">{item.label}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">Active</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-[#F1F5F9]">
                    <div className="flex items-center gap-1 mb-1.5">
                      {[1,2,3,4,5].map(i => <Star key={i} className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />)}
                      <span className="text-xs text-[#64748B] ml-1">Excellent service</span>
                    </div>
                    <p className="text-xs text-[#94A3B8] italic">&ldquo;Very professional and caring. Highly recommended.&rdquo;</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-b border-[#E2E8F0] bg-[#F8FAFC] py-5">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-[#64748B]">
            {trustItems.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <p className="text-[#0F4C81] font-semibold text-sm uppercase tracking-widest mb-2">Our Services</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] mb-4">
              Comprehensive Healthcare Solutions
            </h2>
            <p className="text-[#64748B] max-w-2xl mx-auto">
              From home-based nursing care to full hospital staffing, RAFFATI delivers verified healthcare professionals tailored to your needs.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <div key={service.title} className="group rounded-2xl border border-[#E2E8F0] p-6 hover:border-[#0F4C81] hover:shadow-lg transition-all cursor-pointer">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EBF4FF] group-hover:bg-[#0F4C81] transition-colors">
                    <Icon className="h-6 w-6 text-[#0F4C81] group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-base font-bold text-[#0F172A] mb-2">{service.title}</h3>
                  <p className="text-sm text-[#64748B] mb-4 leading-relaxed">{service.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {service.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-[#F1F5F9] text-xs text-[#374151]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-[#F8FAFC]">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <p className="text-[#0F4C81] font-semibold text-sm uppercase tracking-widest mb-2">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] mb-4">Simple. Trusted. Fast.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {howItWorks.map((step, i) => (
              <div key={step.title} className="relative text-center">
                {i < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-[#E2E8F0]" />
                )}
                <div className="relative z-10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0F4C81] text-white text-xl font-bold">
                  {i + 1}
                </div>
                <h3 className="text-sm font-bold text-[#0F172A] mb-2">{step.title}</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[#0F4C81] font-semibold text-sm uppercase tracking-widest mb-2">Why RAFFATI</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] mb-6">
                Healthcare Staffing You Can Trust
              </h2>
              <p className="text-[#64748B] mb-8 leading-relaxed">
                Every professional on careLINK is rigorously vetted, background-checked, and credentialed. We don&apos;t just match — we monitor, evaluate, and guarantee quality care.
              </p>
              <div className="space-y-4">
                {whyChooseUs.map((item) => (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#EBF4FF] flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-[#0F4C81]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">{item.title}</p>
                      <p className="text-sm text-[#64748B]">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {impactStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] p-6 text-center">
                  <p className="text-4xl font-extrabold text-[#0F4C81] mb-1">{stat.value}</p>
                  <p className="text-sm text-[#64748B]">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-[#F8FAFC]">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <p className="text-[#0F4C81] font-semibold text-sm uppercase tracking-widest mb-2">Testimonials</p>
            <h2 className="text-3xl font-bold text-[#0F172A]">Trusted by Families & Professionals</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl bg-white border border-[#E2E8F0] p-6 shadow-sm">
                <div className="flex items-center gap-1 mb-4">
                  {[1,2,3,4,5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" />
                  ))}
                </div>
                <p className="text-sm text-[#374151] mb-4 leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3 pt-4 border-t border-[#F1F5F9]">
                  <div className="w-9 h-9 rounded-full bg-[#0F4C81] flex items-center justify-center text-white text-sm font-bold">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{t.name}</p>
                    <p className="text-xs text-[#64748B]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-[#0F4C81] to-[#1260A8]">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Experience Better Care?
          </h2>
          <p className="text-white/80 mb-8 text-lg max-w-2xl mx-auto">
            Whether you need care at home or you&apos;re a healthcare professional seeking meaningful work, careLINK connects you with the right opportunity.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
            <Link href="/register?role=client">
              <Button size="xl" variant="secondary">
                Request Care Services
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/register?role=professional">
              <Button size="xl" variant="outline" className="border-white/40 text-white bg-white/10 hover:bg-white/20">
                Register as Professional
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0B1628] py-12 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-[#0F4C81] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">cL</span>
                </div>
                <div>
                  <p className="font-bold text-white text-sm">careLINK</p>
                  <p className="text-white/40 text-xs">by RAFFATI</p>
                </div>
              </div>
              <p className="text-white/50 text-sm leading-relaxed">
                Connecting Quality Care to Every Home across Nigeria.
              </p>
            </div>
            {footerLinks.map((section) => (
              <div key={section.title}>
                <p className="text-white font-semibold text-sm mb-4">{section.title}</p>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-white/50 text-sm hover:text-white transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/30 text-xs">
              &copy; {new Date().getFullYear()} RAFFATI Healthcare Agency. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              {["Privacy Policy", "Terms of Service", "Contact"].map((item) => (
                <Link key={item} href="/" className="text-white/30 text-xs hover:text-white/60 transition-colors">
                  {item}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const heroStats = [
  { value: "500+", label: "Professionals" },
  { value: "1,200+", label: "Families Served" },
  { value: "98%", label: "Satisfaction" },
  { value: "24/7", label: "Support" },
];

const mockAssignment = [
  { emoji: "👩‍⚕️", name: "Nurse Adaeze", label: "Registered Nurse" },
  { emoji: "🧑‍⚕️", name: "Caregiver Emeka", label: "Senior Caregiver" },
];

const trustItems = [
  "Background Verified",
  "License Checked",
  "Insured",
  "MDCN Accredited",
  "24/7 Supervision",
];

const services = [
  {
    icon: Heart,
    title: "Home Care Nursing",
    description: "Registered nurses providing bedside care, medication management, and post-operative recovery at home.",
    tags: ["Hourly", "Daily", "Live-In", "24/7"],
  },
  {
    icon: Users,
    title: "Caregiver Services",
    description: "Compassionate caregivers supporting elderly, disabled, and recovering patients with daily activities.",
    tags: ["Personal Care", "Companionship", "Mobility"],
  },
  {
    icon: Stethoscope,
    title: "Physiotherapy",
    description: "Certified physiotherapists delivering rehabilitation, pain management, and mobility improvement programs.",
    tags: ["Rehabilitation", "Stroke Recovery", "Sports"],
  },
  {
    icon: Building2,
    title: "Hospital Staffing",
    description: "Supplemental healthcare staff for hospitals, clinics, and HMOs during peak periods or permanent positions.",
    tags: ["Contract", "Permanent", "Temporary"],
  },
  {
    icon: Shield,
    title: "Healthcare Outsourcing",
    description: "End-to-end healthcare workforce management for organizations seeking a managed staffing solution.",
    tags: ["NGOs", "Schools", "Nursing Homes"],
  },
  {
    icon: PhoneCall,
    title: "Doctor on Call",
    description: "Experienced doctors for home consultations, regular check-ups, and chronic disease management.",
    tags: ["Hourly", "Daily", "Teleconsultation"],
  },
];

const howItWorks = [
  { title: "Submit a Request", description: "Tell us what care service you need, when, and where." },
  { title: "AI Matching", description: "Our AI engine matches you with the best available professionals." },
  { title: "RAFFATI Approval", description: "Our admin reviews and confirms the perfect match for your needs." },
  { title: "Care Begins", description: "Your verified professional arrives. We monitor quality throughout." },
];

const whyChooseUs = [
  { title: "Rigorous Vetting", description: "Every professional undergoes background checks, license verification, and in-person assessment." },
  { title: "Guaranteed Quality", description: "Monthly scorecards and performance reviews ensure consistent care standards." },
  { title: "Transparent Pricing", description: "Clear, upfront pricing with no hidden fees. Pay via Stripe or Paystack." },
  { title: "24/7 Support", description: "Our team is always available via WhatsApp, call, or email for any concerns." },
];

const impactStats = [
  { value: "500+", label: "Verified Professionals" },
  { value: "1,200+", label: "Families Served" },
  { value: "4.9★", label: "Average Rating" },
  { value: "98%", label: "Retention Rate" },
];

const testimonials = [
  {
    name: "Mrs. Okonkwo",
    role: "Home-Care Client, Lekki",
    quote: "RAFFATI sent us a wonderful nurse for my mother's post-surgery care. The professionalism and compassion were outstanding.",
  },
  {
    name: "Dr. Amara Osei",
    role: "Medical Director, Lagos",
    quote: "careLINK has transformed how we source supplemental staff. Verified, reliable, and always on time.",
  },
  {
    name: "Nurse Chidinma",
    role: "Registered Nurse",
    quote: "Joining RAFFATI was the best career decision I made. Great placements, fair pay, and professional development.",
  },
];

const footerLinks = [
  {
    title: "Services",
    links: [
      { label: "Home Care", href: "/services#home-care" },
      { label: "Nursing", href: "/services#nursing" },
      { label: "Physiotherapy", href: "/services#physio" },
      { label: "Staffing", href: "/services#staffing" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "For Professionals", href: "/register?role=professional" },
      { label: "For Organizations", href: "/register?role=organization" },
      { label: "For Families", href: "/register?role=client" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About RAFFATI", href: "/about" },
      { label: "Contact Us", href: "/contact" },
      { label: "Careers", href: "/careers" },
      { label: "Privacy", href: "/privacy" },
    ],
  },
];
