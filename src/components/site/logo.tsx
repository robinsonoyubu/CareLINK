import { cn } from "@/lib/utils";

/**
 * careLINK wordmark. The mark is two nodes joined by a link — a caregiver and a
 * home, connected. The "LINK" is set tighter and heavier to carry the metaphor.
 */
export function Logo({
  className,
  tone = "ink",
}: {
  className?: string;
  tone?: "ink" | "light";
}) {
  const text = tone === "light" ? "text-linen" : "text-ink";
  const accent = tone === "light" ? "text-marigold" : "text-pine";
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width="26"
        height="26"
        viewBox="0 0 26 26"
        fill="none"
        aria-hidden="true"
        className={accent}
      >
        <circle cx="6" cy="13" r="4" stroke="currentColor" strokeWidth="2.4" />
        <circle cx="20" cy="13" r="4" stroke="currentColor" strokeWidth="2.4" />
        <path
          d="M9.5 13h7"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
      <span
        className={cn(
          "font-display text-[1.35rem] leading-none tracking-tight",
          text,
        )}
      >
        care<span className="font-extrabold">LINK</span>
      </span>
    </span>
  );
}
