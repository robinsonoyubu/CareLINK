import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Create your account" };

type Role = "client" | "professional";

const roles: { value: Role; label: string; blurb: string }[] = [
  { value: "client", label: "I need care", blurb: "Find a professional for my family" },
  { value: "professional", label: "I give care", blurb: "Get matched to work nearby" },
];

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role: roleParam } = await searchParams;
  const role: Role = roleParam === "professional" ? "professional" : "client";

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">
        Create your careLINK account
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Two minutes to start. No card required.
      </p>

      {/* Role selector */}
      <div className="mt-7 grid grid-cols-2 gap-2.5">
        {roles.map((r) => {
          const active = r.value === role;
          return (
            <Link
              key={r.value}
              href={`/register?role=${r.value}`}
              className={cn(
                "rounded-[var(--radius-md)] border p-3.5 transition-all",
                active
                  ? "border-pine bg-sage-soft shadow-[var(--shadow-soft)]"
                  : "border-border bg-card hover:border-sage",
              )}
              aria-pressed={active}
            >
              <span className="block text-sm font-semibold text-ink">
                {r.label}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {r.blurb}
              </span>
            </Link>
          );
        })}
      </div>

      <form className="mt-6 space-y-4">
        <Field label="Full name" htmlFor="name">
          <Input id="name" placeholder="Amaka Okoro" autoComplete="name" />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" />
        </Field>
        <Field label="Phone (WhatsApp)" htmlFor="phone" hint="We send care updates here.">
          <Input id="phone" type="tel" placeholder="+234 800 000 0000" autoComplete="tel" />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" type="password" placeholder="At least 8 characters" autoComplete="new-password" />
        </Field>

        <Button type="submit" variant="primary" size="lg" className="w-full">
          {role === "professional" ? "Join as a professional" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-pine hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
