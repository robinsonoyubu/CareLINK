import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = "text", ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "h-11 w-full rounded-[var(--radius-sm)] border border-border bg-card px-3.5 text-[0.95rem] text-ink shadow-sm transition-colors",
      "placeholder:text-muted-foreground/70",
      "focus-visible:border-pine focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-pine",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
