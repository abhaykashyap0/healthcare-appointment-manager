# Healthcare Appointment & Follow-up Manager

A clinic platform with separate portals for patients, doctors, and admin.
Patients book appointments and share symptoms in advance; doctors get an AI
pre-visit summary and produce a post-visit summary for the patient; both sides
get email and Google Calendar updates throughout.

**Stack:** Node.js (Express) + React, MongoDB, groq for LLM
summaries, Brevo.com for email, Google Calendar API (OAuth 2.0).

---

## 1. Project structure

```
healthcare-appointment-manager/
├── backend/
│   ├── src/
│   │   ├── config/          # DB connection
│   │   ├── controllers/     # Route handlers
│   │   ├── jobs/            # Cron background jobs
│   │   ├── middleware/      # Auth, error handling
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # Express routers
│   │   ├── services/        # LLM, email, calendar, slot logic
│   │   ├── utils/           # Logger, JWT, seed script
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/         # Auth context
│   │   ├── pages/
│   │   ├── services/        # axios instance
│   │   ├── App.js
│   │   └── index.js
│   ├── .env.example
│   └── package.json
└── docs/
    └── system-design.md     # Architecture write-up (slot conflicts, leave, holds, notifications)
```

## 2. Prerequisites

- Node.js 18+
- MongoDB (local install or a free Atlas cluster)
- A Groq API key ([console.groq.com](https://console.groq.com))
- A Brevo account for sending email 
- A Google Cloud project with the Calendar API enabled (for Calendar sync)

## 3. Backend setup

```bash
cd backend
npm install
cp .env.example .env
# fill in .env (see "Environment variables" below)
npm run seed   # creates an admin account + one sample doctor for local testing
npm run dev    # starts the API on http://localhost:5000
```

The seed script creates:
- Admin: `admin@clinic.com` / `Admin@12345`
- Sample doctor: `dr.sharma@clinic.com` / `Doctor@12345`

**Change these passwords immediately in any real deployment.**

## 4. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
# set REACT_APP_API_URL if your backend isn't on localhost:5000
npm start      # starts the app on http://localhost:3000
```

## 5. Environment variables (backend `.env`)

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing auth tokens — use a long random string |
| `GROQ_API_KEY` | Groq API key for pre/post-visit summaries |
| `GROQ_MODEL` | Defaults to `llama-3.1-8b-instant` |
|  Email provider credentials |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | Google OAuth credentials |
| `SLOT_HOLD_TTL_MINUTES` | How long a slot stays reserved while the patient fills the symptom form (default 5) |
| `REMINDER_CRON` / `EMAIL_RETRY_CRON` | Cron schedules for background jobs |

See `backend/.env.example` for the full annotated list.

## 6. Google Calendar setup steps

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create (or select) a project.
2. Navigate to **APIs & Services → Library**, search for **Google Calendar API**, and enable it.
3. Navigate to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Application type: **Web application**.
   - Authorized redirect URI: `http://localhost:5000/api/calendar/oauth/callback` (matches `GOOGLE_REDIRECT_URI` in `.env`).
4. Copy the generated **Client ID** and **Client Secret** into the backend `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
5. In the app, log in and visit **Settings → Connect Google Calendar**. This redirects to Google's consent screen; after granting access, tokens are stored against your user account and used to create/update/delete calendar events automatically on booking, reschedule, and cancellation.
6. If your OAuth app is in "Testing" mode in Google Cloud Console, add the test users' Google accounts under **OAuth consent screen → Test users**, or publish the app for general use.

If a user hasn't connected Google Calendar, the system skips calendar event creation gracefully — it does not block booking.

## 7. Database schema (MongoDB / Mongoose)

**User** — shared collection for patients, doctors, and admins (role-based via a `role` enum). Stores hashed password (bcrypt), optional Google OAuth tokens, and doctor-specific `specialisation`.

**DoctorProfile** — one per doctor user. Holds `specialisation`, `slotDurationMinutes`, a `workingHours` array (per weekday start/end time and working flag), and a `leaves` array (date + reason).

**Appointment** — the central booking record:
- `patient`, `doctor`, `doctorProfile` references
- `slotStart` / `slotEnd`
- `status`: `held → confirmed → completed`, or `cancelled` at any point
- `heldExpiresAt` for the slot-hold TTL mechanism
- `symptoms` + `preVisitSummary` (urgency, chief complaint, suggested questions, raw LLM output, failure flag)
- `doctorNotes` + `prescription.medications[]` + `postVisitSummary`
- `calendarEvents` (patient/doctor event IDs)
- `notifications[]` — audit trail of every email attempt, used by the retry job

Key indexes:
- Partial unique index on `(doctor, slotStart)` for `status in [held, confirmed]` — the double-booking guarantee.
- TTL index on `heldExpiresAt` for `status: held` — backstop for hold expiry (an active cron job also sweeps these for promptness).

## 8. LLM prompts used

**Pre-visit summary** (generated when a patient confirms a booking with symptoms):

> Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: `<symptoms>`

The model is asked to return structured JSON (`urgencyLevel`, `chiefComplaint`, `suggestedQuestions`), parsed and stored on the appointment. On any LLM failure, the system falls back to `urgencyLevel: Medium` and surfaces the raw symptoms text directly, flagged as `failed: true`, so a doctor is never left with nothing.

**Post-visit summary** (generated when a doctor submits clinical notes):

> Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: `<notes>`

On failure, the patient-facing summary falls back to the doctor's original notes verbatim, prefixed with a note that AI simplification wasn't available.

Both prompts live in `backend/src/services/llmService.js`.

## 9. Background jobs

| Job | Cadence | Purpose |
|---|---|---|
| `expireStaleHolds` | every minute | Releases slot holds past their TTL |
| `sendReminders` | `REMINDER_CRON` (default every 15 min) | Sends a reminder email ~24h before each confirmed appointment |
| `sendMedicationReminders` | same cadence | Sends medication reminders based on prescription frequency/duration |
| `retryFailedEmails` | `EMAIL_RETRY_CRON` (default every 5 min) | Retries any failed email notification up to 5 attempts |

## 10. API overview

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/admin/doctors`, `GET /api/admin/doctors`, `PATCH /api/admin/doctors/:id`, `POST /api/admin/doctors/:id/leave`
- `GET /api/doctors`, `GET /api/doctors/:id`
- `GET /api/appointments/availability/:doctorId?date=YYYY-MM-DD`
- `POST /api/appointments/hold`, `POST /api/appointments/:id/confirm`
- `GET /api/appointments`, `GET /api/appointments/:id`
- `POST /api/appointments/:id/post-visit`, `POST /api/appointments/:id/cancel`
- `GET /api/calendar/connect`, `GET /api/calendar/oauth/callback`

See `docs/system-design.md` for the architectural reasoning behind slot
conflicts, leave handling, hold expiry, and notification retries.

## 11. Live deployment

| | URL |
|---|---|
| **Frontend (Vercel)** | https://healthcare-appointment-manager.vercel.app |
| **Backend API (Render)** | https://healthcare-appointment-manager.onrender.com |
| **Health check** | https://healthcare-appointment-manager.onrender.com/api/health |

**Hosting:** frontend on Vercel, backend on Render (free tier), database on MongoDB Atlas (free M0 cluster).

**Note:** the backend free tier spins down after a period of inactivity. The
first request after idle can take 30–60 seconds to respond while the service
wakes up — this is expected, not a bug.

**Demo accounts** (seeded for evaluation):
- Admin: `admin@clinic.com`
- Sample doctor: `dr.sharma@clinic.com`

Passwords have been rotated from the defaults shown elsewhere in this repo's
history for security; request current credentials separately if needed for
grading, or register a new patient account directly via the **Register** page
to test the full booking flow end to end.

## 12. Deployment notes (for redeploying elsewhere)

- Set `NODE_ENV=production` and a strong `JWT_SECRET` in production.
- Use a managed MongoDB (Atlas) and update `MONGO_URI`.
- Update `GOOGLE_REDIRECT_URI` and the OAuth client's authorized redirect URI to your deployed backend URL.
- Update `CLIENT_URL` in the backend `.env` to your deployed frontend URL (used for CORS and OAuth redirects).
- Update `REACT_APP_API_URL` in the frontend `.env` to your deployed backend URL before running `npm run build`.
- For hosts without shell access (e.g. Render free tier), use the one-time `POST /api/auth/seed` endpoint (protected by a `SEED_KEY` env var) instead of running `npm run seed` directly — see `backend/src/routes/authRoutes.js`. Remove `SEED_KEY` after use.

