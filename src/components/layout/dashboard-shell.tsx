"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, Siren } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "./sidebar";
import type { UserRole } from "@/types";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url?: string | null;
}

const MobileMenuContext = createContext<() => void>(() => {});
export const useMobileMenu = () => useContext(MobileMenuContext);

export function DashboardShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <MobileMenuContext.Provider value={() => setMobileOpen(true)}>
      <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
        <Sidebar
          role={profile.role}
          userName={profile.full_name}
          userEmail={profile.email}
          avatarUrl={profile.avatar_url ?? undefined}
          onSignOut={handleSignOut}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <main className="flex-1 overflow-y-auto min-w-0">
          {/* Mobile top bar: menu + emergency access are always one tap away. */}
          <div className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-2 bg-[#0F4C81] px-4 py-2 text-white">
            <button onClick={() => setMobileOpen(true)} className="p-1.5 -ml-1.5 rounded-md hover:bg-white/10" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-bold text-sm">MedLINK <span className="font-normal text-white/60">by RGH</span></span>
            <Link href="/ambulance?emergency=1" className="flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold">
              <Siren className="h-3.5 w-3.5" /> Emergency
            </Link>
          </div>
          {children}
        </main>
      </div>
    </MobileMenuContext.Provider>
  );
}
