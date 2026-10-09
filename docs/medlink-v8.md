# MedLINK by RGH — Master Workflow v8: implementation notes

How the v8 workflow maps onto this codebase, and what must happen before launch.

## Where each section lives

| v8 section | Code |
|---|---|
| 1 Navigation | `src/lib/medlink/navigation.ts` (primary nav + role workspace), `src/components/layout/sidebar.tsx`. Removed sections are listed in `REMOVED_SECTIONS` and covered by a test. Old routes (`/messages`, `/settings`, `/clients/bookings`, `/clients/cases`) redirect to the single hubs (`next.config.ts`). |
| 2 Roles | `profiles.role` adds `provider`. Facility delegation: `organization_members` (`org_admin`, `attendance_admin`). |
| 3 Registration & verification | Profile → Registration & verification (`src/components/profile/professional-application.tsx`); RGH review at `/admin/verification`; flow enforced by `/api/professionals/[id]/application`. Sensitive data lives in `professional_credentials` (only the professional + RGH can read it). |
| 4 Workforce & assignment | `assignments.stage`; activating an organization assignment creates the `facility_staff` row (`/api/assignments/[id]/status`); facilities verify arrival and set facility status in Facility Attendance → Workforce. |
| 5 Secure attendance | QR signing `src/lib/attendance/qr.ts`, geofence `geofence.ts`, face adapter `face.ts`, three-layer decision `evaluate.ts`; APIs under `src/app/api/attendance/*`; staff UI `/attendance`, facility console `/attendance/facility`. `attendance_events` is append-only (trigger) with a replay-protection unique index. |
| 6–9 Hospitals, Diagnostics, Pharmacy, Ambulance | `/hospitals`, `/diagnostics`, `/pharmacy`, `/ambulance` (+ `[id]`); creation rules in `src/app/api/bookings/route.ts`. Emergencies skip payment and chat. |
| 10 Human chat | `/chats` (provider chats + Workforce Hub), launched via `/api/chats/start`; new-message alerts via DB trigger. |
| 11 Ratings | `reviews` + trigger allowing only the booker of a **completed** booking; aggregates update provider/professional ratings. |
| 12 My Bookings | `bookings` table, `/bookings`, `/bookings/[id]`; status rules in `src/lib/medlink/bookings.ts`; history in `booking_events`. |
| 13 Payments | Bank Transfer / Transfer Payment proofs in `transfer_payments`; verification by the provider, or by RGH for professional care. |
| 14 Google Calendar | `src/lib/medlink/google-calendar.ts`, `/api/calendar/google/*`, Profile → Calendar Integration. |
| 15 Notifications | `notify()` in `src/lib/medlink/server.ts`; `/notifications`. |
| 16 Dispute Centre | `/disputes`, `disputes` + `dispute_events` (status changes logged by trigger). |
| 17–18 Earn & games | SQL functions `start_ad_impression`, `complete_ad_impression`, `request_withdrawal`; `/earn`, `/earn/history`, `/admin/earn`; Classic Snake playable, other five games listed as in development. |
| 19 Health Gist | `/health-gist`; reports moderated at `/admin/moderation`. |
| 20 AI assistant | `/assistant`, `src/app/api/ai/assistant/route.ts` (read-only tools; the user confirms any booking themselves). |
| 21 Profile & privacy | `/profile` (account, registration, privacy consents, calendar, rewards). Private files use the `medlink-private` bucket and short-lived signed URLs (`/api/files/signed`). |
| 23 Ownership | Provider Portal `/provider`; RGH Operations `/admin`. |

## Fixes to pre-existing schema bugs (in migration 007)

Found by applying the migrations to a real Postgres:

1. Every signed-in read of `profiles` failed with "infinite recursion" (a `profiles` policy queried `profiles`). Replaced with a security-definer `my_role()` helper.
2. Professional and organization sign-ups failed in the 004 trigger (missing `profession` / `contact_person`).

If production was patched by hand, check that 007 applies cleanly before running it.

## Launch blockers (not solvable in code alone)

- **Facial/liveness provider**: set `FACE_VERIFICATION_API_URL` / `_KEY` to a licensed provider. Until then every automatic clock-in is rejected and needs an Attendance Admin exception. Face enrolment (`face_enrollments`) must be done by RGH with recorded consent.
- **`ATTENDANCE_QR_SECRET`**: required (≥32 chars); the QR endpoint throws without it.
- **Coin-to-cash rate**: set ₦/coin in `/admin/earn`. Withdrawals stay closed until it is set and enabled. OPay payouts are recorded manually by RGH (no payout API integration).
- **Nigerian data protection (NDPA 2023)** review of the facial, location, health and ID data flows; define retention periods (`face_enrollments.retention_until` exists, no purge job yet).
- **Games**: WHOT! name/artwork rights or a renamed identity; original art for the Lagos route game; content review for Lagos Life.
- **Google Calendar**: create the OAuth client and set `GOOGLE_CLIENT_ID` / `_SECRET`.
- **Storage**: create the `medlink-private` bucket if the migration couldn't (it logs a notice).
- **RGH bank details** for professional-care transfers (`RGH_BANK_*`).
- Regenerate `src/types/database.types.ts` with `supabase gen types`; the new tables are loosely typed for now.
- Stripe/Paystack code still exists, but v8 flows use bank transfer only.
