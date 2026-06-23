import { cn } from "@/lib/utils";

/**
 * The signature element: careLINK's namesake link, drawn.
 * A verified professional (top) connected to a family's home (bottom) by a
 * link line, with a pulse travelling along it like a heartbeat. The line draws
 * itself on load; the pulse loops. Both are pure CSS and respect reduced motion
 * (see globals.css). Coordinates live in the SVG's own space so the travelling
 * bead tracks the path exactly at any size.
 */
const LINK_PATH = "M118 128 C 118 232, 282 250, 282 350";

export function HeroConnection({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative aspect-[4/5] w-full max-w-[420px] rounded-[var(--radius-xl)] border border-sage bg-linen shadow-[var(--shadow-lift)]",
        className,
      )}
    >
      {/* soft pine wash in the corners */}
      <div className="pointer-events-none absolute inset-0 rounded-[var(--radius-xl)] bg-[radial-gradient(120%_80%_at_15%_0%,rgba(12,74,64,0.06),transparent_55%),radial-gradient(120%_80%_at_85%_100%,rgba(244,166,56,0.10),transparent_55%)]" />

      <svg
        viewBox="0 0 400 500"
        className="relative h-full w-full"
        role="img"
        aria-label="A verified nurse, Amaka, linked to the Okoro family's home — matched in 18 minutes."
      >
        {/* the link line */}
        <path
          d={LINK_PATH}
          fill="none"
          stroke="var(--color-pine)"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="link-path"
          style={{ ["--link-length" as string]: 380 }}
        />
        {/* travelling pulse */}
        <circle
          r="5"
          fill="var(--color-marigold)"
          className="link-bead"
          style={{ ["--link-offset-path" as string]: `path("${LINK_PATH}")` }}
        />

        {/* mid-line status pill */}
        <g transform="translate(200 250)">
          <rect
            x="-66"
            y="-15"
            width="132"
            height="30"
            rx="15"
            fill="var(--color-pine-deep)"
          />
          <text
            x="0"
            y="5"
            textAnchor="middle"
            fontSize="13"
            fontFamily="var(--font-sans)"
            fill="#ffffff"
            fontWeight="500"
          >
            matched in 18 min
          </text>
        </g>

        {/* professional node */}
        <g transform="translate(118 90)">
          <circle r="38" fill="var(--color-pine)" />
          {/* simple caregiver glyph */}
          <circle cx="0" cy="-9" r="12" fill="#ffffff" opacity="0.95" />
          <path
            d="M-18 20 a18 18 0 0 1 36 0 z"
            fill="#ffffff"
            opacity="0.95"
          />
          {/* verified tick */}
          <g transform="translate(28 -28)">
            <circle r="13" fill="var(--color-marigold)" />
            <path
              d="M-5 0 l3.5 4 L7 -5"
              fill="none"
              stroke="var(--color-pine-deep)"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </g>
        <text x="170" y="78" fontSize="17" fontFamily="var(--font-display)" fontWeight="600" fill="var(--color-ink)">
          Amaka O.
        </text>
        <text x="170" y="100" fontSize="13.5" fontFamily="var(--font-sans)" fill="var(--color-muted-foreground)">
          Registered Nurse · Verified
        </text>

        {/* home node */}
        <g transform="translate(282 410)">
          <circle r="38" fill="var(--color-sage-soft)" stroke="var(--color-sage)" strokeWidth="1.5" />
          {/* home glyph */}
          <path
            d="M-15 4 L0 -13 L15 4 V18 a2 2 0 0 1-2 2 H-13 a2 2 0 0 1-2-2 Z"
            fill="none"
            stroke="var(--color-pine)"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
        </g>
        <text x="60" y="404" fontSize="17" fontFamily="var(--font-display)" fontWeight="600" fill="var(--color-ink)" textAnchor="end">
          The Okoro family
        </text>
        <text x="60" y="426" fontSize="13.5" fontFamily="var(--font-sans)" fill="var(--color-muted-foreground)" textAnchor="end">
          Lekki · daily home visits
        </text>
      </svg>
    </div>
  );
}
