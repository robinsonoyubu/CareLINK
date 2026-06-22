import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F4C81] via-[#1a6ab5] to-[#0a3560] flex flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-[#0F4C81] font-bold text-sm">cL</span>
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">careLINK</p>
            <p className="text-white/60 text-xs leading-tight">by RAFFATI</p>
          </div>
        </Link>
        <p className="text-white/60 text-sm hidden sm:block">
          Connecting Quality Care to Every Home
        </p>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        {children}
      </main>

      <footer className="py-4 px-6 text-center">
        <p className="text-white/40 text-xs">
          &copy; {new Date().getFullYear()} RAFFATI Healthcare Agency. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
