import Link from "next/link";
import { Logo } from "./logo";

const columns = [
  {
    title: "Care at home",
    links: [
      { href: "/#families", label: "Find a professional" },
      { href: "/services", label: "Care services" },
      { href: "/#how", label: "How it works" },
      { href: "/#trust", label: "Trust & safety" },
    ],
  },
  {
    title: "Professionals",
    links: [
      { href: "/#professionals", label: "Find work" },
      { href: "/register", label: "Join careLINK" },
      { href: "/cv-builder", label: "Build your CV" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About RAFFATI" },
      { href: "/contact", label: "Contact" },
      { href: "/blog", label: "Journal" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-mist">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Care, linked to every home. Vetted nurses, caregivers and
              therapists matched to the families who need them — built for
              Nigeria.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="font-display text-sm font-semibold text-ink">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-pine"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} RAFFATI Healthcare. All rights reserved.</p>
          <p className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-pine">Privacy</Link>
            <Link href="/terms" className="hover:text-pine">Terms</Link>
            <span>Lagos · Nigeria</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
