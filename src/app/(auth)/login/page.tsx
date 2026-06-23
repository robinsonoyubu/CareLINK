import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">Welcome back</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Log in to manage your care, assignments and payments.
      </p>

      <form className="mt-8 space-y-4">
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" type="password" placeholder="••••••••" autoComplete="current-password" />
        </Field>

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm text-pine hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full">
          Log in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to careLINK?{" "}
        <Link href="/register" className="font-medium text-pine hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
