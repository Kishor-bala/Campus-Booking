# Campus Resource Booking System — Unified Master Build Guide

## Overview & Architecture

This guide is the **complete, end-to-end build specification** for the Campus Resource Booking System. It unifies all core MVP features (React frontend, Express 5 backend, PostgreSQL 17 database with concurrency-safe booking transactions) and advanced production enhancements (SMTP emails, `.ics` calendar sync, pre-slot reminder cron jobs, room capacity checks, QR code check-in with no-show auto-release, and slot waitlists).

The guide is organized in **13 sequential phases**. Each phase is self-contained with its **objectives, database migrations, environment variables, API contracts, code file tree, step-by-step AI implementation prompt, and verification checklist**.

---

### System Architecture Diagram

```mermaid
flowchart TD
    subgraph Client["Tier 1: Presentation (React + Vite)"]
        UI["Student / Admin Browser"]
    end

    subgraph Proxy["Reverse Proxy (Single Origin)"]
        RP["Nginx / Vite Proxy"]
    end

    subgraph Backend["Tier 2: Application (Express 5 Node.js)"]
        Routes["API Controllers & Middlewares"]
        AuthService["Auth & PostgreSQL Session Store"]
        BookingService["Booking & Concurrency Service"]
        MailService["SMTP Email Dispatcher (Nodemailer)"]
        CalendarService["iCalendar Generator (.ics)"]
        QRService["QR Token & Check-in Service"]
        CronService["Background Cron Workers (Reminders & No-Show)"]
    end

    subgraph Data["Tier 3: Data & Infrastructure"]
        DB[("PostgreSQL 17 Database")]
        SMTP["External SMTP Server (Gmail / Mailtrap / SendGrid)"]
    end

    UI -->|"HTTP / REST Requests"| RP
    RP -->|"/api requests"| Routes
    Routes --> AuthService
    Routes --> BookingService
    AuthService --> DB
    BookingService --> DB
    BookingService --> MailService
    BookingService --> CalendarService
    BookingService --> QRService
    CalendarService -->|"Attach .ics file buffer"| MailService
    MailService -->|"SMTP Protocol"| SMTP
    CronService -->|"Polls DB (Every 5 mins)"| DB
    CronService -->|"Dispatches reminder / no-show emails"| MailService
```

---

## Complete Master Roadmap Summary

| Phase | Phase Name | Core Responsibility | Key Technologies |
| :---: | :--- | :--- | :--- |
| **Phase 1** | Project Setup & Scaffolding | Express 5 API entry, Vite React scaffold, proxy, logging | Express 5, Vite, Pino, Helmet |
| **Phase 2** | DB Schema & Seeds | PostgreSQL tables, partial unique index, canonical slots, seeds | PostgreSQL 17, `node-pg-migrate` |
| **Phase 3** | Auth & Session Engine | Argon2id hashing, PG session store, CSRF, role middleware | `express-session`, `connect-pg-simple`, Argon2 |
| **Phase 4** | Catalogue & Admin Management| Resource CRUD, slot generation, deactivation & closure rules | Express, Zod, Parameterized SQL |
| **Phase 5** | Concurrency Booking Engine | Database transactions, row locking, race-condition protection | PostgreSQL Transactions & Locks |
| **Phase 6** | React Frontend MVP | Screens (`/login`, `/resources`, `/my-bookings`, `/admin`), components | React Router, Plain CSS, Fetch API |
| **Phase 7** | SMTP Email Engine | Welcome, confirmation, and cancellation email dispatcher | `nodemailer`, `handlebars` |
| **Phase 8** | `.ics` Calendar Invites | Dynamic iCalendar buffer generation & 1-click sync | `ics` package |
| **Phase 9** | Pre-Slot Reminders | Background cron worker sending 1-hour pre-slot alerts | `node-cron` |
| **Phase 10** | Attendee Capacity Rules | Require attendee count & validate against room capacity | Zod schema validation |
| **Phase 11** | QR Check-in & Auto-Release | QR code scan check-in; 15-min no-show auto-cancellation | `qrcode`, `crypto`, `node-cron` |
| **Phase 12** | Slot Waitlist Engine | Auto-notify waitlisted users on cancellation with claim link | PostgreSQL queue |
| **Phase 13** | End-to-End Verification & Deploy| Vitest integration tests, Nginx reverse proxy, Docker setup | Vitest, Supertest, Docker |

---

## 🛠️ Complete Master Environment Configuration (`.env`)

Create `server/.env` with the following variables:

```env
# Server & Origin Configuration
PORT=4000
NODE_ENV=development
APP_ORIGIN=http://localhost:5173

# Database Connections
DATABASE_URL=postgres://postgres:password@localhost:5432/campus_booking_dev
MIGRATION_DATABASE_URL=postgres://postgres:password@localhost:5432/campus_booking_dev
TEST_DATABASE_URL=postgres://postgres:password@localhost:5432/campus_booking_test

# Authentication & Security
SESSION_SECRET=super_secret_random_string_at_least_32_chars_long

# Seed Admin Credentials (Used by 'npm run db:seed')
SEED_ADMIN_EMAIL=admin@campus.edu
SEED_ADMIN_PASSWORD=AdminSecurePassword123!

# SMTP Configuration (Phases 7, 8, 9, 11, 12)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM_NAME="Campus Resource Booking"
MAIL_FROM_ADDRESS="no-reply@campus.edu"

# Cron & QR Token Secrets (Phases 9, 11)
REMINDER_CRON_INTERVAL="*/5 * * * *"
CHECKIN_TOKEN_SECRET=super_secret_hmac_key_for_qr_codes
```

---

## 🚀 Phase 1: Project Setup & Scaffolding

### 1.1 Objective
Scaffold the workspace with separate `client/` (React + Vite) and `server/` (Express 5 ES Modules) packages, configure CORS/proxying, structured logging (`pino`), environment validation, and liveness/readiness health endpoints.

### 1.2 File Tree Setup
```text
campus-resource-booking/
├── client/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── db/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── app.js
│   │   └── index.js
│   ├── package.json
│   └── .env.example
```

### 1.3 Health API Endpoints
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health/live` | Public | Liveness status (HTTP 200) |
| `GET` | `/api/health/ready` | Public | Database readiness check (HTTP 200 or 503) |

### 1.4 Phase 1 AI Prompt
```text
Implement Phase 1: Scaffolding and Environment Configuration for Campus Resource Booking.

1. Initialize a root repository containing `client/` (React with Vite + React Router) and `server/` (Express 5 ES-module package).
2. Configure client/vite.config.js to proxy `/api` requests to `http://localhost:4000`.
3. In `server/`, setup `src/app.js` with express.json(), helmet(), pino-http logger, and error middleware. Separate app.js from src/index.js (listen server).
4. Add `/api/health/live` (returns 200 OK) and `/api/health/ready` (tests database pool and returns 200 or 503).
5. Create `.env.example` containing placeholders for PORT, NODE_ENV, DATABASE_URL, and SESSION_SECRET.
6. Verify client builds with `npm run build` and server starts without errors.
```

### 1.5 Phase 1 Verification Checklist
- [ ] Client starts on `http://localhost:5173`.
- [ ] Server starts on `http://localhost:4000`.
- [ ] Calling `GET http://localhost:5173/api/health/live` via Vite proxy returns `{"status":"live"}`.

---

## 🗄️ Phase 2: Database Schema, Partial Unique Index & Seed Data

### 2.1 Objective
Create versioned migrations for `users`, `resources`, `resource_slots`, `bookings`, `booking_events`, and `sessions`. Implement the critical **partial unique index** to prevent double bookings. Provide a seed script generating 2 students, 1 admin, 6 resources, and 14 days of canonical slots.

### 2.2 Database Migrations (`server/migrations/`)

```sql
-- 001_create_users.sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('STUDENT', 'ADMIN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 002_create_resources.sql
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(100) NOT NULL,
  capacity INT NOT NULL CHECK (capacity > 0),
  rules TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 003_create_resource_slots.sql
CREATE TABLE resource_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  slot_index INT NOT NULL CHECK (slot_index BETWEEN 0 AND 7),
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(resource_id, booking_date, slot_index)
);

-- 004_create_bookings.sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES resource_slots(id) ON DELETE CASCADE,
  purpose VARCHAR(300) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('CONFIRMED', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES users(id),
  cancellation_reason VARCHAR(300)
);

-- ESSENTIAL DOUBLE-BOOKING CONFLICT CONSTRAINT
CREATE UNIQUE INDEX one_confirmed_booking_per_slot
ON bookings (slot_id)
WHERE status = 'CONFIRMED';

-- 005_create_booking_events.sql
CREATE TABLE booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES users(id),
  event_type VARCHAR(50) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  details JSONB
);
```

### 2.3 Phase 2 AI Prompt
```text
Implement Phase 2: Schema Migrations and Seed Engine.

1. Install `node-pg-migrate` and configure package scripts `npm run db:migrate` and `npm run db:seed`.
2. Write migrations for `users`, `resources`, `resource_slots`, `bookings`, `booking_events`, and `sessions` matching the documented schema.
3. Crucial: Add partial unique index `CREATE UNIQUE INDEX one_confirmed_booking_per_slot ON bookings (slot_id) WHERE status = 'CONFIRMED';`.
4. Define canonical slots: fixed 1-hour slots from 09:00 to 17:00 IST represented by slot_index 0 through 7.
5. Create a seed script `server/scripts/seed.js` inserting 2 student accounts, 1 admin account (using SEED_ADMIN_EMAIL & SEED_ADMIN_PASSWORD), 6 resources, and 14 days of slots. Make seed idempotent.
```

### 2.4 Phase 2 Verification Checklist
- [ ] `npm run db:migrate` succeeds on a fresh PostgreSQL database.
- [ ] `npm run db:seed` inserts initial users, resources, and slots without errors.
- [ ] Inserting two `CONFIRMED` rows for the same `slot_id` manually in SQL fails with a unique index violation.

---

## 🔐 Phase 3: Authentication, Session Store & Security

### 3.1 Objective
Implement secure server-side session authentication using PostgreSQL (`express-session` + `connect-pg-simple`), Argon2id password hashing, session rotation, synchronizer CSRF tokens, and role authorization middleware (`STUDENT`, `ADMIN`).

### 3.2 API Contracts Added
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/csrf` | Public | Obtain session-bound CSRF token |
| `POST` | `/api/auth/register` | Public + CSRF | Create STUDENT account (never ADMIN) |
| `POST` | `/api/auth/login` | Public + CSRF | Authenticate user, rotate session ID |
| `GET` | `/api/auth/me` | Signed In | Get current user identity |
| `POST` | `/api/auth/logout` | Signed In + CSRF | Destroy session & clear cookie |

### 3.3 Phase 3 AI Prompt
```text
Implement Phase 3: Authentication, Sessions, CSRF, and Role Middleware.

1. Install `argon2`, `express-session`, `connect-pg-simple`, and `zod`.
2. Configure express-session using connect-pg-simple database store. Cookie settings: HttpOnly, SameSite=Lax, Secure in production.
3. Build CSRF token middleware issuing session-bound CSRF tokens via `GET /api/auth/csrf` and validating custom header `x-csrf-token` on state-changing requests.
4. Build `POST /api/auth/register` (strictly sets role='STUDENT', hashes password with Argon2id), `POST /api/auth/login` (verifies hash, rotates session ID & CSRF token), `GET /api/auth/me`, and `POST /api/auth/logout`.
5. Create `requireAuth` and `requireRole('ADMIN')` middlewares.
6. Test registration, login, CSRF enforcement, and role privilege blocking (HTTP 403).
```

### 3.4 Phase 3 Verification Checklist
- [ ] Registration always creates a `STUDENT` account (privilege escalation fields are stripped).
- [ ] Invalid passwords return generic HTTP 401.
- [ ] State-changing requests without `x-csrf-token` header return HTTP 403.
- [ ] A logged-in `STUDENT` calling an admin route receives HTTP 403.

---

## 📦 Phase 4: Core Catalogue & Admin Resource Management

### 4.1 Objective
Build student resource browsing/filtering APIs and admin resource management (CRUD, slot generation, resource deactivation, and slot closure policies).

### 4.2 API Contracts Added
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/resources` | Signed In | Search/filter active resources |
| `GET` | `/api/resources/:id` | Signed In | Get resource details |
| `GET` | `/api/resources/:id/slots?date=YYYY-MM-DD` | Signed In | Get slot grid with IST timestamps |
| `GET` | `/api/admin/resources` | Admin | List all resources (including inactive) |
| `POST` | `/api/admin/resources` | Admin + CSRF | Create new resource |
| `PATCH` | `/api/admin/resources/:id` | Admin + CSRF | Edit or deactivate resource |
| `POST` | `/api/admin/resources/:id/slots/generate` | Admin + CSRF | Idempotently generate canonical slots |
| `PATCH` | `/api/admin/slots/:id` | Admin + CSRF | Set `is_open` (reject if booking exists) |

### 4.3 Phase 4 AI Prompt
```text
Implement Phase 4: Resource Catalogue and Admin Management Endpoints.

1. Implement `GET /api/resources` with search (name/location), category filter, and bounded pagination.
2. Implement `GET /api/resources/:id/slots?date=YYYY-MM-DD` returning slots with calculated startsAt and endsAt timestamps formatted in Asia/Kolkata.
3. Build admin endpoints: `POST /api/admin/resources` (create resource), `PATCH /api/admin/resources/:id` (edit/deactivate), `POST /api/admin/resources/:id/slots/generate` (generates slots for date range), and `PATCH /api/admin/slots/:id` (opens/closes slot).
4. Policy enforcement: Reject slot closure or resource deactivation if an active `CONFIRMED` booking exists that has not ended. Return HTTP 409 conflict.
```

### 4.4 Phase 4 Verification Checklist
- [ ] Student can list active resources and query slot availability.
- [ ] Closing a slot with an active confirmed booking returns HTTP 409 Conflict.
- [ ] Generating slots twice for the same date range is idempotent and creates no duplicates.

---

## ⚡ Phase 5: Concurrency-Safe Booking Engine

### 5.1 Objective
Build transactional booking and cancellation operations with strict PostgreSQL row locking, race-condition protection, error mapping, and audit logging.

### 5.2 Safe Booking Transaction Protocol
```javascript
// Lock Order: Resources -> Resource Slots -> Insert Booking
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // 1. Lock Resource & Slot
  await client.query('SELECT id FROM resources WHERE id = $1 FOR UPDATE', [resourceId]);
  const slotRes = await client.query('SELECT * FROM resource_slots WHERE id = $1 FOR UPDATE', [slotId]);
  
  // 2. Validate active, open & future slot state
  if (!slotRes.rows[0].is_open) throw new Error('SLOT_CLOSED');
  
  // 3. Insert CONFIRMED Booking
  const bookingRes = await client.query(
    'INSERT INTO bookings (user_id, slot_id, purpose, status) VALUES ($1, $2, $3, $4) RETURNING *',
    [userId, slotId, purpose, 'CONFIRMED']
  );
  
  // 4. Audit Event
  await client.query(
    'INSERT INTO booking_events (booking_id, actor_user_id, event_type) VALUES ($1, $2, $3)',
    [bookingRes.rows[0].id, userId, 'CREATED']
  );
  
  await client.query('COMMIT');
  return bookingRes.rows[0];
} catch (err) {
  await client.query('ROLLBACK');
  if (err.code === '23505' && err.constraint === 'one_confirmed_booking_per_slot') {
    const error = new Error('This slot was just booked by another user.');
    error.statusCode = 409;
    error.code = 'SLOT_ALREADY_BOOKED';
    throw error;
  }
  throw err;
} finally {
  client.release();
}
```

### 5.3 API Contracts Added
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/bookings` | Signed In + CSRF | Book slot (`{ slotId, purpose }`) |
| `GET` | `/api/bookings/mine` | Signed In | View user's personal booking history |
| `POST` | `/api/bookings/:id/cancel` | Owner/Admin + CSRF | Cancel booking (Admin requires reason) |
| `GET` | `/api/admin/bookings` | Admin | Filter all system bookings |
| `GET` | `/api/admin/bookings/:id/events` | Admin | View booking audit log history |

### 5.4 Phase 5 AI Prompt
```text
Implement Phase 5: Transactional Booking Engine and Audit Events.

1. Implement `POST /api/bookings` using a single borrowed client transaction with `FOR UPDATE` row locking.
2. Resolve user ID from session. Insert `CONFIRMED` booking and `CREATED` audit event in `booking_events`.
3. Map partial unique index violation (`one_confirmed_booking_per_slot`) to HTTP 409 `SLOT_ALREADY_BOOKED`. Roll back and release client in finally block.
4. Implement `POST /api/bookings/:id/cancel`:
   - Students can only cancel their own future bookings.
   - Admins can cancel any booking before it ends and MUST supply a cancellation reason.
   - Idempotent: Repeating an authorized cancellation returns existing cancelled status without duplicating audit events.
5. Build `GET /api/bookings/mine`, `GET /api/admin/bookings`, and `GET /api/admin/bookings/:id/events`.
```

### 5.5 Phase 5 Verification Checklist
- [ ] Concurrent submission of 2 booking requests for the same slot produces exactly one `201 Created` and one `409 Conflict`.
- [ ] Cancelling a booking permits a new student to book the freed slot.
- [ ] Repeat cancellation returns existing result without duplicating events.

---

## 🎨 Phase 6: Full React Frontend Interface

### 6.1 Objective
Build responsive React UI screens using React Router, plain CSS, auth context, CSRF token handling, and real API integrations (no mock data).

### 6.2 Screens & Components Layout
```text
client/src/
├── api/
│   └── client.js         # Fetch wrapper with CSRF & credential handling
├── context/
│   └── AuthContext.jsx   # Current user & session provider
├── components/
│   ├── Navigation.jsx
│   ├── ResourceCard.jsx
│   ├── SlotPicker.jsx
│   ├── BookingForm.jsx
│   └── StatusMessage.jsx
└── pages/
    ├── Login.jsx
    ├── Register.jsx
    ├── ResourceList.jsx
    ├── ResourceDetail.jsx
    ├── MyBookings.jsx
    └── AdminDashboard.jsx
```

### 6.3 Phase 6 AI Prompt
```text
Implement Phase 6: React Frontend Interface.

1. Create single API fetch wrapper (`client/src/api/client.js`) that automatically fetches and attaches `x-csrf-token` header to state-changing requests and includes credentials.
2. Build `AuthContext` restoring user state on load via `GET /api/auth/me`.
3. Create pages: `/login`, `/register`, `/resources` (catalog search/filter), `/resources/:id` (slot grid), `/my-bookings` (upcoming/past/cancelled tabs + cancel modal), and `/admin` (tabs for Resources, Slots, and Bookings).
4. Use plain CSS with a sleek dark/light theme, clear badges for IST timestamps, loading spinners, empty states, and error alerts (handling 409 conflicts gracefully).
5. Verify complete end-to-end user journey: Register -> Login -> Pick Slot -> Book -> View My Bookings -> Cancel.
```

### 6.4 Phase 6 Verification Checklist
- [ ] Registering and logging in updates header user identity state.
- [ ] Booking a slot shows loading state, disables double submits, and updates slot state to `Booked`.
- [ ] Refreshing the page preserves session identity.

---

## 📧 Phase 7: SMTP Email Notification Engine

### 7.1 Objective
Integrate Nodemailer to send branded, responsive HTML emails for student sign-up, booking confirmation, and cancellations.

### 7.2 Files to Create / Modify
* `server/src/services/mailer.service.js`: Mail transporter & dispatch methods.
* `server/src/templates/welcome.html`, `booking-confirmation.html`, `booking-cancellation.html`.

### 7.3 Phase 7 AI Prompt
```text
Implement Phase 7: SMTP Email Notification Engine.

1. Install `nodemailer` and `handlebars`.
2. Read SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM_NAME, and MAIL_FROM_ADDRESS from process.env.
3. Create `server/src/services/mailer.service.js` with methods:
   - sendWelcomeEmail({ email, name })
   - sendBookingConfirmationEmail({ booking, user, resource, slot })
   - sendBookingCancellationEmail({ booking, user, resource, slot, reason, cancelledBy })
4. Build responsive HTML templates with inline CSS showing IST booking timestamps and campus branding.
5. Trigger email sending asynchronously from booking & cancellation controllers so mail failures do not block database transactions.
```

### 7.4 Phase 7 Verification Checklist
- [ ] Registering a user triggers a welcome email.
- [ ] Confirming a booking sends a confirmation email containing booking reference & IST times.
- [ ] Cancelling a booking sends a cancellation email displaying reason.

---

## 📅 Phase 8: iCalendar (`.ics`) Invite & Calendar Sync

### 8.1 Objective
Generate dynamic `.ics` calendar invitation files, attach them to confirmation emails, and provide a downloadable endpoint on the React UI.

### 8.2 API Contracts Added
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/bookings/:id/ics` | Signed In | Download `.ics` calendar file |

### 8.3 Phase 8 AI Prompt
```text
Implement Phase 8: iCalendar (.ics) Invite Generation & Sync.

1. Install `ics` package in server directory.
2. Create `server/src/services/calendar.service.js` with function `generateICSBuffer({ booking, resource, slot })`:
   - Parse slot booking_date and slot_index into Asia/Kolkata start/end time arrays `[YYYY, M, D, H, M]`.
   - Set Title: "Campus Reservation: " + resource.name
   - Set Description: "Booking Ref: " + booking.id + "\nPurpose: " + booking.purpose
   - Set Location: resource.location
   - Return Promise resolving to Buffer.
3. Update `mailer.service.js` to attach `.ics` buffer as `booking-[id].ics` to confirmation emails.
4. Add endpoint `GET /api/bookings/:id/ics` returning the file download.
5. Add "Add to Calendar (.ics)" button on React My Bookings UI.
```

### 8.4 Phase 8 Verification Checklist
- [ ] Confirmation email arrives with `.ics` attachment.
- [ ] Opening `.ics` file imports booking into Google / Apple / Outlook calendar with exact IST time.
- [ ] Clicking "Download .ics" on React UI downloads the calendar file.

---

## ⏰ Phase 9: Automated Pre-Slot Reminders (Cron Worker)

### 9.1 Objective
Set up a background cron worker (`node-cron`) to poll upcoming bookings starting in 1 hour and dispatch automated email reminders.

### 9.2 Database Migration (`007_add_reminder_sent.sql`)
```sql
ALTER TABLE bookings
ADD COLUMN reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_bookings_reminder ON bookings (status, reminder_sent);
```

### 9.3 Phase 9 AI Prompt
```text
Implement Phase 9: Automated Pre-Slot Reminders.

1. Install `node-cron` in server package.
2. Migration: Add `reminder_sent BOOLEAN NOT NULL DEFAULT FALSE` to `bookings`.
3. Create `server/src/jobs/reminder.job.js`:
   - Schedule cron job running every 5 minutes (`*/5 * * * *`).
   - Query DB for bookings where `status = 'CONFIRMED'`, `reminder_sent = false`, and slot start time is 55–65 minutes away.
   - For each match, send reminder email via `mailer.service.js` and set `reminder_sent = true`.
4. Register cron job in `server/src/index.js` with graceful shutdown logic.
```

### 9.4 Phase 9 Verification Checklist
- [ ] Cron job detects booking 1 hour prior to start.
- [ ] Reminder email is dispatched and `reminder_sent` flag is updated in DB.

---

## 👥 Phase 10: Attendee Count & Capacity Validation

### 10.1 Objective
Require students to specify the number of attendees when booking, and enforce backend validation against room capacity limits.

### 10.2 Database Migration (`008_add_attendee_count.sql`)
```sql
ALTER TABLE bookings
ADD COLUMN attendee_count INT NOT NULL DEFAULT 1;
```

### 10.3 Phase 10 AI Prompt
```text
Implement Phase 10: Attendee Count & Capacity Rule.

1. Migration: Add `attendee_count INT NOT NULL DEFAULT 1` to `bookings`.
2. Update backend Zod booking validation schema: `attendeeCount` must be integer >= 1.
3. Update `POST /api/bookings` service: Check if `attendeeCount > resource.capacity`. If true, return HTTP 400 `EXCEEDS_CAPACITY`.
4. Update React `BookingForm` component: Add "Number of Attendees" numeric input (max = resource.capacity) with UI validation.
```

### 10.4 Phase 10 Verification Checklist
- [ ] Entering attendee count > capacity returns HTTP 400 `EXCEEDS_CAPACITY`.
- [ ] Valid attendee count is saved to database.

---

## 📲 Phase 11: QR Code Self Check-in & No-Show Auto-Release

### 11.1 Objective
Generate cryptographic QR code tokens for bookings. Students scan QR codes at room doors to check in. If unchecked after 15 minutes post-start, auto-cancel the slot.

### 11.2 Database Migration (`009_add_checkin_fields.sql`)
```sql
ALTER TABLE bookings
ADD COLUMN checkin_token VARCHAR(128) UNIQUE,
ADD COLUMN checked_in BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN checked_in_at TIMESTAMPTZ;
```

### 11.3 API Contracts Added
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/bookings/:id/qrcode` | Owner/Admin | Get QR code PNG image |
| `POST` | `/api/bookings/:id/check-in` | Signed In | Perform QR check-in with token |

### 11.4 Phase 11 AI Prompt
```text
Implement Phase 11: QR Code Check-in and No-Show Auto-Release.

1. Install `qrcode` in server package.
2. Migration: Add `checkin_token`, `checked_in`, and `checked_in_at` to `bookings`.
3. Upon booking creation, generate HMAC token stored in `checkin_token`.
4. Add endpoint `GET /api/bookings/:id/qrcode` returning Data URL QR code.
5. Add endpoint `POST /api/bookings/:id/check-in` validating token & setting `checked_in = true`.
6. Add background cron job `server/src/jobs/noshow.job.js` running every 5 mins:
   - Find bookings where `status = 'CONFIRMED'`, `checked_in = false`, and slot start time was > 15 minutes ago.
   - Cancel booking (`status = 'CANCELLED'`, reason = "No-show auto-cancellation").
   - Send notification email.
```

### 11.5 Phase 11 Verification Checklist
- [ ] Booking page displays scannable QR code.
- [ ] Scanning QR code sets `checked_in = true`.
- [ ] Simulating no-show auto-cancels booking after 15 mins.

---

## ⏳ Phase 12: Slot Waitlist Queue Engine

### 12.1 Objective
Allow students to join waitlists for booked slots. When a slot is cancelled, auto-notify the #1 waitlisted student with a 15-minute priority claim link.

### 12.2 Database Migration (`010_create_waitlists_table.sql`)
```sql
CREATE TABLE booking_waitlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES resource_slots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  UNIQUE(slot_id, user_id)
);
```

### 12.3 API Contracts Added
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/slots/:id/waitlist` | Signed In | Join waitlist for slot |
| `DELETE` | `/api/slots/:id/waitlist` | Signed In | Leave waitlist |
| `POST` | `/api/slots/:id/claim-waitlist` | Signed In | Claim priority slot |

### 12.4 Phase 12 AI Prompt
```text
Implement Phase 12: Slot Waitlist Queue & Priority Claims.

1. Migration: Create `booking_waitlists` table.
2. Add `POST /api/slots/:id/waitlist` and `DELETE /api/slots/:id/waitlist`.
3. Update cancellation service: When booking is cancelled, find oldest waitlisted user for slot, set `notified_at = NOW()`, `expires_at = NOW() + 15 mins`, and email claim link.
4. Add `POST /api/slots/:id/claim-waitlist`: Validate claim window and convert waitlist entry to CONFIRMED booking.
5. Add "Join Waitlist" button to React UI for booked slots.
```

### 12.5 Phase 12 Verification Checklist
- [ ] Student B joins waitlist for booked slot.
- [ ] Student A cancels -> Student B receives priority claim email.
- [ ] Student B claims slot within 15 mins -> Booking confirmed.

---

## 🧪 Phase 13: End-to-End Acceptance Verification & Deployment

### 13.1 Objective
Run full Vitest integration suite, package frontend build (`client/dist`), configure Nginx reverse proxy, and package application with Docker Compose.

### 13.2 Docker Compose Configuration (`infra/docker-compose.yml`)
```yaml
version: '3.8'
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_DB: campus_booking_dev
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build: ../server
    environment:
      NODE_ENV: production
      PORT: 4000
      DATABASE_URL: postgres://postgres:password@db:5432/campus_booking_dev
    ports:
      - "4000:4000"
    depends_on:
      - db

volumes:
  pgdata:
```

### 13.3 Phase 13 AI Prompt
```text
Implement Phase 13: End-to-End Verification and Deployment Packaging.

1. Write integration tests using Vitest and Supertest in `server/tests/`:
   - Concurrency booking race condition test (2 simultaneous requests).
   - Cross-user cancellation protection (Student A cannot cancel Student B's booking).
   - Admin RBAC enforcement (Student calling admin endpoint gets 403).
2. Configure frontend production build: `npm run build` producing `client/dist`.
3. Create `infra/nginx.conf` routing static SPA files and proxying `/api` to Express backend.
4. Create multi-stage `Dockerfile` and `infra/docker-compose.yml` orchestrating PostgreSQL, Express API, and Nginx.
5. Document deployment sequence: migrations -> seeds -> API startup -> Nginx proxy verification over HTTPS.
```

### 13.4 Phase 13 Verification Checklist
- [ ] All Vitest integration tests pass.
- [ ] `docker compose up --build` starts all services cleanly.
- [ ] Site operates seamlessly over single origin HTTPS setup.
