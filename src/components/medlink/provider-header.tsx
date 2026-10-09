import { MapPin, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { RghVerifiedBadge, RatingSummary, ResponseTime } from "./badges";
import { ChatButton } from "./chat-button";
import type { ProviderRow } from "./provider-directory";

export function ProviderHeader({ provider, chatLabel, phone }: { provider: ProviderRow; chatLabel: string; phone?: string | null }) {
  return (
    <Card>
      <CardContent className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-[#0F172A]">{provider.name}</h2>
            {provider.is_verified && <RghVerifiedBadge />}
          </div>
          {provider.description && <p className="text-sm text-[#64748B]">{provider.description}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#64748B]">
            {provider.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{provider.address}{provider.city ? `, ${provider.city}` : ""}</span>}
            {phone && <a href={`tel:${phone}`} className="flex items-center gap-1 hover:text-[#0F4C81]"><Phone className="h-3 w-3" />{phone}</a>}
            <RatingSummary avg={provider.rating_avg} count={provider.rating_count} />
            <ResponseTime minutes={provider.avg_response_minutes} sample={provider.response_sample_size} />
          </div>
        </div>
        <ChatButton providerId={provider.id} label={chatLabel} className="flex-shrink-0" />
      </CardContent>
    </Card>
  );
}

export function ReviewsList({ reviews }: { reviews: { id: string; rating: number; comment: string | null; created_at: string }[] }) {
  if (reviews.length === 0) return null;
  return (
    <section aria-labelledby="reviews-h" className="space-y-2">
      <h3 id="reviews-h" className="text-sm font-semibold text-[#0F172A]">Recent reviews</h3>
      <p className="text-xs text-[#94A3B8]">From completed MedLINK bookings. Reviews supplement, and never replace, RGH verification.</p>
      <ul className="space-y-2">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-lg border border-[#E2E8F0] bg-white p-3 text-sm">
            <span className="text-amber-500" aria-label={`${r.rating} out of 5`}>{"★".repeat(r.rating)}<span className="text-[#E2E8F0]">{"★".repeat(5 - r.rating)}</span></span>
            {r.comment && <p className="mt-1 text-[#374151]">{r.comment}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
