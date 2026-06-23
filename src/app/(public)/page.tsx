import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroConnection } from "@/components/site/hero-connection";

export default function HomePage() {
  return (
    <>
      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-[1.05fr_0.95fr] md:py-24">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-sage bg-sage-soft px-3.5 py-1.5 text-xs font-medium text-pine">
              <span className="h-1.5 w-1.5 rounded-full bg-marigold" />
              Trusted home care across Nigeria
            </span>

            <h1 className="mt-6 font-display text-[2.6rem] font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl">
              Care, linked to{" "}
              <span className="relative whitespace-nowrap text-pine">
                every home
                <svg
                  className="absolute -bottom-2 left-0 w-full text-marigold"
                  viewBox="0 0 300 12"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 9 C 80 2, 220 2, 298 8"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            <p className="mt-7 max-w-md text-lg leading-relaxed text-muted-foreground">
              careLINK connects families to vetted nurses, caregivers and
              therapists for care at home — and gives those professionals
              steady, fairly-paid work. One link, both lives better.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/register?role=client">
                <Button size="lg" variant="primary">
                  Find care for my family
                </Button>
              </Link>
              <Link href="/register?role=professional">
                <Button size="lg" variant="outline">
                  I'm a care professional
                </Button>
              </Link>
            </div>

            <dl className="mt-12 flex gap-9 border-t border-border pt-7">
              {[
                ["1,800+", "vetted professionals"],
                ["18 min", "median match time"],
                ["4.9/5", "family rating"],
              ].map(([stat, label]) => (
                <div key={label}>
                  <dt className="font-display text-2xl font-semibold text-pine">
                    {stat}
                  </dt>
                  <dd className="mt-1 text-xs text-muted-foreground">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex justify-center md:justify-end">
            <HeroConnection />
          </div>
        </div>
      </section>

      {/* ---- Trust band ---- */}
      <section className="border-y border-border bg-mist">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-5 py-6 text-sm text-muted-foreground">
          {[
            "NMCN & MDCN credentials checked",
            "Background-verified",
            "Updates over WhatsApp",
            "Pay securely with Paystack",
          ].map((item) => (
            <span key={item} className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="10" cy="10" r="9" stroke="var(--color-pine)" strokeWidth="1.6" />
                <path d="M6 10.2l2.6 2.6L14 7.4" stroke="var(--color-pine)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* ---- How it works (a real sequence, so numbered) ---- */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-marigold-deep">
            How careLINK works
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">
            Three steps from need to care.
          </h2>
        </div>

        <ol className="mt-14 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-border bg-border sm:grid-cols-3">
          {[
            {
              n: "01",
              title: "Tell us what's needed",
              body: "A few questions about the person, the condition, the hours and the location. Two minutes, no forms to print.",
            },
            {
              n: "02",
              title: "We make the link",
              body: "We match you with verified professionals nearby whose skills fit — ranked, with real reviews. You choose who.",
            },
            {
              n: "03",
              title: "Care begins at home",
              body: "Your professional starts. Track visits, message them, and pay safely — all in one place, updates on WhatsApp.",
            },
          ].map((step) => (
            <li key={step.n} className="bg-card p-7">
              <span className="font-display text-sm font-semibold tracking-widest text-marigold-deep">
                {step.n}
              </span>
              <h3 className="mt-4 font-display text-xl font-semibold text-ink">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- Two audiences ---- */}
      <section className="bg-pine text-linen">
        <div className="mx-auto grid max-w-6xl gap-px bg-pine-soft/40 md:grid-cols-2">
          <div id="families" className="bg-pine p-9 md:p-14">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              For families
            </h2>
            <p className="mt-4 max-w-md text-[0.97rem] leading-relaxed text-sage">
              Caring for a parent, a newborn, or recovery after surgery is hard
              enough. We take the searching, the vetting and the worry off your
              plate.
            </p>
            <ul className="mt-7 space-y-3.5">
              {[
                "Vetted, credential-checked professionals only",
                "Match in minutes, not weeks",
                "Replace or change carers any time",
                "Transparent pricing — pay per visit or monthly",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3 text-sage">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-marigold" />
                  <span className="text-[0.97rem]">{f}</span>
                </li>
              ))}
            </ul>
            <Link href="/register?role=client" className="mt-8 inline-block">
              <Button variant="accent" size="md">
                Find care now
              </Button>
            </Link>
          </div>

          <div id="professionals" className="bg-pine-deep p-9 md:p-14">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              For care professionals
            </h2>
            <p className="mt-4 max-w-md text-[0.97rem] leading-relaxed text-sage">
              Nurses, caregivers, physios and health attendants — build a
              reputation, get matched to nearby work, and get paid on time,
              every time.
            </p>
            <ul className="mt-7 space-y-3.5">
              {[
                "Steady assignments matched to your skills",
                "A verified profile families can trust",
                "Free AI-assisted CV builder",
                "Reliable payouts, performance that pays",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3 text-sage">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-marigold" />
                  <span className="text-[0.97rem]">{f}</span>
                </li>
              ))}
            </ul>
            <Link href="/register?role=professional" className="mt-8 inline-block">
              <Button variant="accent" size="md">
                Join careLINK
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ---- Trust & safety ---- */}
      <section id="trust" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="grid gap-12 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-marigold-deep">
              Trust &amp; safety
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">
              The link only forms once we trust it.
            </h2>
            <p className="mt-5 max-w-md text-[0.97rem] leading-relaxed text-muted-foreground">
              Every professional clears a four-stage check before a single
              family ever sees them. Verification isn't a badge here — it's the
              whole point.
            </p>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2">
            {[
              ["Identity", "Government ID and live photo match."],
              ["Credentials", "NMCN / MDCN licences verified at source."],
              ["History", "References and prior placements checked."],
              ["Ongoing", "Every assignment rated; standards held."],
            ].map(([title, body]) => (
              <li
                key={title}
                className="rounded-[var(--radius-md)] border border-border bg-card p-5 shadow-[var(--shadow-soft)]"
              >
                <h3 className="font-display text-base font-semibold text-pine">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- Closing CTA ---- */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] bg-pine px-8 py-14 text-center text-linen md:py-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_50%_-10%,rgba(244,166,56,0.18),transparent_60%)]" />
          <h2 className="relative font-display text-3xl font-bold sm:text-4xl">
            Someone you love deserves the right hands.
          </h2>
          <p className="relative mx-auto mt-4 max-w-md text-sage">
            Make the link today. It takes two minutes to start.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/register?role=client">
              <Button variant="accent" size="lg">
                Find care for my family
              </Button>
            </Link>
            <Link href="/register?role=professional">
              <Button
                variant="outline"
                size="lg"
                className="border-sage/40 text-linen hover:border-linen hover:text-linen"
              >
                Work with careLINK
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
