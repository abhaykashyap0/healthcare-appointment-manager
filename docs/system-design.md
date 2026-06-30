# System Design Write-up

## Double-booking prevention

The core safety mechanism is a partial unique MongoDB index on the `Appointment`
collection: `{ doctor: 1, slotStart: 1 }`, unique, scoped to documents where
`status` is `held` or `confirmed`. This means the database itself rejects a
second active appointment for the same doctor and slot, regardless of how many
requests arrive concurrently. The application layer also runs a pre-check query
before insert for fast, friendly feedback, but that check is inherently racy
under concurrency — two requests can both pass the check before either writes.
The unique index is the actual guarantee: when two simultaneous booking
attempts race for the same slot, MongoDB allows the first insert and throws a
duplicate-key error (code 11000) on the second. A global error-handling
middleware catches this and converts it into a clean `409 Conflict` response
telling the patient to pick another slot. This avoids needing distributed locks
or transactions while still being correct under concurrent access, because the
guarantee lives at the data layer rather than in application logic that could
be bypassed by a race window.

## Slot hold mechanism

Booking is two-phase. When a patient selects a slot, the system creates an
appointment with `status: held` and a `heldExpiresAt` timestamp a few minutes
in the future (configurable via `SLOT_HOLD_TTL_MINUTES`). This reserves the
slot — it counts against the unique index above — while the patient fills in
the symptom form. If they confirm in time, status flips to `confirmed`, the
hold expiry is cleared, and downstream actions (LLM summary, emails, calendar
events) fire. If they don't confirm in time, the hold is released so other
patients can book the slot.

Two complementary mechanisms enforce expiry. First, a MongoDB TTL index
(`expireAfterSeconds: 0` on `heldExpiresAt`, scoped to `status: held`) will
eventually delete stale documents, but TTL sweeps run on a background cycle
with up to ~60 seconds of lag, which is too imprecise for a smooth booking
flow. So second, and more importantly, a cron job (`expireHolds.js`) runs every
minute and actively flips any held appointment past its expiry to
`status: cancelled` with `cancelledBy: system`. This frees the slot for other
patients almost immediately and preserves a clear audit trail. The frontend
also shows a live countdown so users have implicit feedback rather than being
silently kicked out.

## Doctor leave conflict handling

Doctor leave is recorded as a date entry on the `DoctorProfile` document, and
the slot-generation service excludes that date entirely from availability for
any future bookings. The harder problem is *existing* bookings made before the
leave was declared. When an admin marks a doctor on leave for a date that
already has held or confirmed appointments, the system queries all active
appointments for that doctor on that date, transitions each to
`status: cancelled` with `cancelledBy: system`, deletes any associated Google
Calendar events for both patient and doctor, and sends a cancellation email to
each affected patient. The admin endpoint returns a summary of how many
patients were notified and whether each email succeeded, so leave management
is never a silent, unaccountable action.

## Notification failure handling

External services (SMTP and Google Calendar) are wrapped so they never throw
into the main request flow — both `sendEmail` and the calendar functions catch
their own errors and return a success/failure result object instead. This
means an SMTP outage cannot prevent a booking from completing; the appointment
is still confirmed, and the failed notification is recorded as a status entry
(`pending` / `sent` / `failed`) on the appointment document, along with the
attempt count and error message. A separate background job
(`retryFailedEmails.js`) scans for failed notifications every five minutes and
retries them up to a configurable attempt ceiling, rebuilding the appropriate
template based on the notification type. This decouples notification delivery
from the booking transaction itself: the booking is the source of truth, and
notifications are a best-effort, retried side effect — appropriate for a
domain where losing an appointment because an email server hiccuped would be
far worse than a delayed reminder.

## LLM integration and graceful degradation

Both the pre-visit and post-visit LLM calls are wrapped in try/catch with
explicit fallback objects rather than allowing a thrown error to break the
booking or visit-completion flow. On pre-visit failure, the system defaults
urgency to `Medium` (a safer default than silently omitting urgency) and
surfaces the raw symptoms text directly to the doctor with a `failed: true`
flag the frontend uses to show a warning. On post-visit failure, the patient
still receives the doctor's original clinical notes rather than nothing. This
ensures the clinical workflow — which must not break — is decoupled from LLM
availability.
