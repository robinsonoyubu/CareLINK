import { Metadata } from "next";
import Link from "next/link";
import { Home, Building2, Heart, Activity, Users, Briefcase, Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Our Services | careLINK by RAFFATI",
  description: "Home care, nursing, physiotherapy, hospital staffing, and outsourcing services across Nigeria.",
};

const services = [
  {
    icon: Home,
    title: "Home Care",
    slug: "home-care",
    tagline: "Professional care in the comfort of your home",
    description: "Our trained home care aides provide personalised support for daily living activities, medication management, and companionship for elderly or recovering patients.",
    features: ["Daily living assistance", "Medication reminders", "Post-surgery recovery", "Elderly companionship", "Night & live-in care"],
    color: "text-[#0F4C81]",
    bg: "bg-[#EBF4FF]",
  },
  {
    icon: Heart,
    title: "Nursing Services",
    slug: "nursing",
    tagline: "Qualified nurses for home and facility care",
    description: "Registered and enrolled nurses deployed to manage complex medical needs, wound care, IV therapy, and chronic disease management at home or in your facility.",
    features: ["Wound & dressing care", "IV cannulation & therapy", "Chronic disease management", "Post-op nursing", "Paediatric nursing"],
    color: "text-rose-500",
    bg: "bg-rose-50",
  },
  {
    icon: Users,
    title: "Caregiver Services",
    slug: "caregiver",
    tagline: "Compassionate support for every need",
    description: "Professional caregivers trained in patient handling, cognitive support, and personal hygiene — available for hourly, daily, or live-in arrangements.",
    features: ["Personal hygiene assistance", "Mobility & transfers", "Cognitive support", "Respite care", "Live-in arrangements"],
    color: "text-[#22C55E]",
    bg: "bg-green-50",
  },
  {
    icon: Activity,
    title: "Physiotherapy",
    slug: "physiotherapy",
    tagline: "Restore movement, rebuild strength",
    description: "Certified physiotherapists delivering rehabilitation programmes at home or in clinical settings — for stroke recovery, orthopaedic surgery, sports injuries, and neurological conditions.",
    features: ["Stroke rehabilitation", "Post-orthopaedic surgery", "Sports injury recovery", "Neurological conditions", "Paediatric physio"],
    color: "text-[#8B5CF6]",
    bg: "bg-purple-50",
  },
  {
    icon: Building2,
    title: "Hospital Staffing",
    slug: "staffing",
    tagline: "Reliable healthcare professionals on demand",
    description: "We supply trained nurses, nurse assistants, and support staff to hospitals, clinics, and diagnostic centres experiencing staffing gaps or seasonal demand.",
    features: ["Short & long-term placements", "Ward nurses", "Theatre assistants", "Healthcare assistants", "Night & weekend cover"],
    color: "text-[#F59E0B]",
    bg: "bg-amber-50",
  },
  {
    icon: Briefcase,
    title: "Outsourcing",
    slug: "outsourcing",
    tagline: "End-to-end workforce outsourcing",
    description: "Corporate healthcare outsourcing for organisations needing dedicated health personnel — occupational health nurses, first-aiders, and on-site medical teams.",
    features: ["Occupational health nurses", "On-site medical teams", "First-aider training & supply", "Corporate wellness", "Health checks"],
    color: "text-[#06B6D4]",
    bg: "bg-cyan-50",
  },
];

export default function ServicesPage() {
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
            <Link href="/contact" className="text-sm text-[#64748B] hover:text-[#0F4C81]">Contact</Link>
            <Link href="/login" className="text-sm bg-[#0F4C81] text-white px-4 py-2 rounded-lg hover:bg-[#0F4C81]/90">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      <section className="bg-gradient-to-br from-[#0F4C81] to-[#1a6eb5] py-20 text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">Our Healthcare Services</h1>
          <p className="text-xl text-blue-100">
            Comprehensive care solutions for individuals, families, hospitals, and organisations across Nigeria.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <div key={service.slug} className="rounded-2xl border border-gray-100 p-7 hover:shadow-lg transition-shadow">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${service.bg} mb-4`}>
                  <service.icon className={`h-6 w-6 ${service.color}`} />
                </div>
                <h3 className="text-lg font-bold text-[#0F172A] mb-1">{service.title}</h3>
                <p className="text-sm text-[#0F4C81] font-medium mb-3">{service.tagline}</p>
                <p className="text-sm text-[#64748B] mb-5 leading-relaxed">{service.description}</p>
                <ul className="space-y-1.5">
                  {service.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[#374151]">
                      <Check className="h-4 w-4 text-[#22C55E] flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0F4C81] py-16 text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-blue-100 mb-8">Contact us today and we’ll match you with the right care professional within 24 hours.</p>
          <Link href="/contact" className="bg-white text-[#0F4C81] font-semibold px-8 py-3 rounded-xl hover:bg-gray-50 transition-colors inline-block">
            Request a Service
          </Link>
        </div>
      </section>

      <footer className="bg-[#0F172A] py-8 text-center text-[#64748B] text-sm">
        <p>© {new Date().getFullYear()} RAFFATI Healthcare. All rights reserved.</p>
      </footer>
    </div>
  );
}
