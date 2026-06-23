import Link from "next/link";
import { Logo } from "@/components/site/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-full lg:grid-cols-[1fr_1.05fr]">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-pine p-12 text-linen lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_20%_0%,rgba(244,166,56,0.16),transparent_55%)]" />
        <Link href="/" className="relative">
          <Logo tone="light" />
        </Link>
        <div className="relative max-w-sm">
          <p className="font-display text-3xl font-semibold leading-tight">
            “The right carer found us in under an hour. My mum is in good hands.”
          </p>
          <p className="mt-5 text-sm text-sage">
            — Chioma A., daughter and careLINK family
          </p>
        </div>
        <p className="relative text-xs text-sage/80">
          careLINK by RAFFATI · Lagos, Nigeria
        </p>
      </aside>

      {/* Form panel */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-6 lg:hidden">
          <Link href="/">
            <Logo />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
