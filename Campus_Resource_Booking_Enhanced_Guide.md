# Campus Resource Booking System — Enhanced Build Guide (V2)

This document provides a **complete, phase-by-phase implementation specification** for upgrading the Campus Resource Booking System with production features:

1. **SMTP Email Notification Engine**
2. **iCalendar (`.ics`) Invite & Calendar Sync**
3. **Automated Pre-Slot Reminders (Background Cron Worker)**
4. **Attendee Count & Capacity Validation**
5. **QR Code Self Check-in & No-Show Auto-Release**
6. **Slot Waitlist & Priority Notification Queue**

Each phase contains its own **Goal, Tech Requirements, Database Migrations, Environment Variables, File Layout, API Contracts, AI Implementation Prompt, and Verification Checklist**.

---

## Master Implementation Roadmap Summary

| Phase | Module Name | Primary Objective | Key Libraries & Tools |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Base System Foundation | React + Express 5 + PostgreSQL 17 base setup | React, Express, pg, Zod |
| **Phase 2** | SMTP Email Engine | Send HTML confirmation & cancellation emails | `nodemailer`, `handlebars` |
| **Phase 3** | `.ics` Calendar Invites | 1-click sync to Google / Apple / Outlook calendar | `ics` package |
| **Phase 4** | Pre-Slot Reminders | Cron job sending automated 1-hour pre-slot alerts | `node-cron` |
| **Phase 5** | Attendee Capacity Logic | Validate attendee count against resource limits | Zod validation |
| **Phase 6** | QR Check-in & Auto-Release | QR code scan check-in; auto-cancel no-shows | `qrcode`, `crypto`, `node-cron` |
| **Phase 7** | Slot Waitlist Engine | Auto-notify waitlisted users on slot cancellation | PostgreSQL queue |

---

## 🏗️ Phase 1: Base System Foundation

### 1.1 Objective
Establish the base 3-tier architecture: React (Vite) frontend, Express 5 backend API, and PostgreSQL 17 database with server-side sessions and partial unique index concurrency protection. *(Refer to [`Campus_Resource_Booking_AI_Build_Guide.md`](file:///c:/Users/kisho/Documents/Event-Task/campus-Resource-Booking-System/Campus_Resource_Booking_AI_Build_Guide.md) for full base specifications).*

### 1.2 Base `.env` Configuration
```env
PORT=4000
NODE_ENV=development
APP_ORIGIN=http://localhost:5173
DATABASE_URL=postgres://postgres:password@localhost:5432/campus_booking_dev
TEST_DATABASE_URL=postgres://postgres:password@localhost:5432/campus_booking_test
SESSION_SECRET=super_secret_random_string_32_chars_long
```

---

## 📧 Phase 2: SMTP Email Notification Engine

### 2.1 Overview & Requirements
Implement an email dispatch service using Nodemailer to send branded, responsive HTML emails to students and administrators.

### 2.2 Environment Variables Added
```env
# Phase 2: SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM_NAME="Campus Resource Booking"
MAIL_FROM_ADDRESS="no-reply@campus.edu"
```

### 2.3 Files to Create / Modify
* `server/src/services/mailer.service.js`: Nodemailer transporter & email dispatch methods.
* `server/src/templates/welcome.html`: Welcome email HTML template.
* `server/src/templates/booking-confirmation.html`: Booking confirmation template.
* `server/src/templates/booking-cancellation.html`: Cancellation notification template.
* `server/src/controllers/booking.controller.js`: Integrate async mail triggers.

### 2.4 API Integration Triggers
* **`POST /api/auth/register`**: Triggers `sendWelcomeEmail(user)`.
* **`POST /api/bookings`**: Triggers `sendBookingConfirmationEmail(booking, user, resource, slot)`.
* **`POST /api/bookings/:id/cancel`**: Triggers `sendBookingCancellationEmail(booking, user, resource, slot, reason, cancelledBy)`.

### 2.5 Phase 2 AI Prompt

```text
Implement Phase 2: SMTP Email Notification Engine for Campus Resource Booking.

1. Install `nodemailer` and `handlebars`.
2. Read SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM_NAME, and MAIL_FROM_ADDRESS from process.env.
3. Create server/src/services/mailer.service.js with methods:
   - sendWelcomeEmail({ email, name })
   - sendBookingConfirmationEmail({ booking, user, resource, slot })
   - sendBookingCancellationEmail({ booking, user, resource, slot, reason, cancelledBy })
4. Create responsive HTML templates using handlebars with clean campus branding, displaying slot date and time in Asia/Kolkata.
5. Call email functions asynchronously inside booking creation and cancellation controllers. Ensure email errors are logged silently without rolling back committed database transactions.
6. Support a test mock transporter when NODE_ENV=test.
```

### 2.6 Verification Checklist
- [ ] Sign up a new student -> Receive welcome email.
- [ ] Create a booking -> Receive confirmation email with booking reference & IST start/end times.
- [ ] Admin cancels a booking -> Student receives cancellation email containing the admin's reason.

---

## 📅 Phase 3: iCalendar (`.ics`) Invite & Calendar Sync

### 3.1 Overview & Requirements
Generate dynamic `.ics` calendar invitation files and attach them to confirmation emails so students can add bookings to Google Calendar, Apple Calendar, or Outlook with 1 click.

### 3.2 Key Dependencies
* `ics` (npm package for generating RFC 5545 iCalendar files).

### 3.3 API Contracts Added
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/bookings/:id/ics` | Signed In | Download `.ics` calendar file for a booking |

### 3.4 Files to Create / Modify
* `server/src/services/calendar.service.js`: Generates iCalendar buffer.
* `server/src/services/mailer.service.js`: Attaches generated `.ics` buffer to confirmation email.
* `client/src/components/BookingCard.jsx`: Adds "Add to Calendar (.ics)" download button.

### 3.5 Phase 3 AI Prompt

```text
Implement Phase 3: iCalendar (.ics) Invite Generation & Sync.

1. Install the `ics` package in server directory.
2. Create server/src/services/calendar.service.js with function `generateICSBuffer({ booking, resource, slot })`:
   - Parse slot booking_date and slot_index into Asia/Kolkata start/end time arrays `[YYYY, M, D, H, M]`.
   - Set title: "Campus Reservation: " + resource.name
   - Set description: "Booking Ref: " + booking.id + "\nPurpose: " + booking.purpose
   - Set location: resource.location
   - Return Promise resolving to a Buffer.
3. Update `mailer.service.js` to call `generateICSBuffer` and attach the buffer as `booking-[id].ics` (contentType: `text/calendar`) to the confirmation email.
4. Add endpoint `GET /api/bookings/:id/ics` returning the `.ics` file download with headers `Content-Type: text/calendar` and `Content-Disposition: attachment; filename=booking.ics`.
5. Add a "Download .ics" button on the React My Bookings UI.
```

### 3.6 Verification Checklist
- [ ] Make a booking -> Inspect email attachment `booking.ics`.
- [ ] Double-click `.ics` attachment -> Apple/Google/Outlook Calendar opens with correct time & location.
- [ ] Click "Download .ics" button on React UI -> Browser downloads `.ics` file.

---

## ⏰ Phase 4: Automated Pre-Slot Reminders (Cron Worker)

### 4.1 Overview & Requirements
Set up a background worker using `node-cron` that periodically checks for upcoming bookings starting in 1 hour and dispatches email reminders.

### 4.2 Database Migration (`007_add_reminder_sent.sql`)
```sql
ALTER TABLE bookings
ADD COLUMN reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_bookings_reminder ON bookings (status, reminder_sent);
```

### 4.3 Files to Create / Modify
* `server/src/jobs/reminder.job.js`: Cron job executing every 5 minutes.
* `server/src/index.js`: Start cron worker on API server startup.

### 4.4 Phase 4 AI Prompt

```text
Implement Phase 4: Automated Pre-Slot Email Reminders.

1. Install `node-cron` in the server package.
2. Create migration adding `reminder_sent BOOLEAN NOT NULL DEFAULT FALSE` to `bookings` table.
3. Create server/src/jobs/reminder.job.js:
   - Schedule a job running every 5 minutes (`*/5 * * * *`).
   - Query DB for confirmed bookings where:
     `status = 'CONFIRMED'`
     `reminder_sent = false`
     Slot start time is between 55 and 65 minutes from current time.
   - For each matching booking, send a reminder email via `mailer.service.js`.
   - Update `reminder_sent = true` for processed bookings.
4. Import and start `reminder.job.js` inside `server/src/index.js` with graceful shutdown handling.
```

### 4.5 Verification Checklist
- [ ] Book a slot starting in ~1 hour -> Cron job detects booking -> Sends reminder email -> Sets `reminder_sent = true`.
- [ ] Check DB -> `reminder_sent` updated to `true` (prevents duplicate emails).

---

## 👥 Phase 5: Attendee Count & Capacity Validation

### 5.1 Overview & Requirements
Require students to specify how many attendees will be using the booked resource and enforce a backend check against the resource's maximum capacity.

### 5.2 Database Migration (`008_add_attendee_count.sql`)
```sql
ALTER TABLE bookings
ADD COLUMN attendee_count INT NOT NULL DEFAULT 1;
```

### 5.3 API Contract Updates
`POST /api/bookings` payload updated:
```json
{
  "slotId": "uuid-here",
  "purpose": "Study session for exam",
  "attendeeCount": 4
}
```

### 5.4 Phase 5 AI Prompt

```text
Implement Phase 5: Attendee Count and Room Capacity Logic.

1. Create migration adding `attendee_count INT NOT NULL DEFAULT 1` to `bookings`.
2. Update backend Zod validation schema for booking creation:
   - `attendeeCount`: positive integer >= 1.
3. Update `POST /api/bookings` service:
   - Fetch target resource capacity.
   - If `attendeeCount > resource.capacity`, return HTTP 400 with error code `EXCEEDS_CAPACITY` and message "Attendee count exceeds room capacity of X".
4. Update React frontend `BookingForm` component:
   - Add a number input field "Number of Attendees" (default: 1, max: resource.capacity).
   - Display dynamic validation message if entered count exceeds room capacity.
```

### 5.5 Verification Checklist
- [ ] Attempt to book a 4-person room with 6 attendees -> Rejected with HTTP 400 `EXCEEDS_CAPACITY`.
- [ ] Book a 4-person room with 3 attendees -> Booking succeeds and stores `attendee_count = 3`.

---

## 📲 Phase 6: QR Code Self Check-in & No-Show Auto-Release

### 6.1 Overview & Requirements
Generate a cryptographic QR code for each booking. Students scan the QR code upon arriving at the room to check in. If a student does not check in within 15 minutes of slot start, the background worker automatically cancels the slot and frees it up.

### 6.2 Database Migration (`009_add_checkin_fields.sql`)
```sql
ALTER TABLE bookings
ADD COLUMN checkin_token VARCHAR(128) UNIQUE,
ADD COLUMN checked_in BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN checked_in_at TIMESTAMPTZ;
```

### 6.3 Environment Variables Added
```env
CHECKIN_TOKEN_SECRET=super_secret_hmac_key_for_qr_codes
```

### 6.4 API Contracts Added
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/bookings/:id/qrcode` | Owner / Admin | Get QR code PNG image for check-in |
| `POST` | `/api/bookings/:id/check-in` | Signed In | Perform check-in with token payload |

### 6.5 Phase 6 AI Prompt

```text
Implement Phase 6: QR Code Self Check-in and No-Show Auto-Release.

1. Install `qrcode` in server package.
2. Create migration adding `checkin_token`, `checked_in`, and `checked_in_at` to `bookings`.
3. Upon booking creation, generate an HMAC token: `crypto.createHmac('sha256', CHECKIN_TOKEN_SECRET).update(booking.id + user.id).digest('hex')` and save to `checkin_token`.
4. Add endpoint `GET /api/bookings/:id/qrcode`:
   - Generate Data URL using `qrcode.toDataURL(checkin_url)`.
   - Return image data to client.
5. Add endpoint `POST /api/bookings/:id/check-in`:
   - Validate token and user session.
   - Check current time is within slot window (up to 15 mins after start time).
   - Update `checked_in = true` and `checked_in_at = NOW()`.
6. Add background job `noshow.job.js` running every 5 minutes:
   - Find bookings where `status = 'CONFIRMED'`, `checked_in = false`, and slot started > 15 minutes ago.
   - Update status to `CANCELLED` (reason: "No-show auto-cancellation").
   - Send notification email to student.
```

### 6.6 Verification Checklist
- [ ] View booking on React UI -> Displays QR code image.
- [ ] Scan QR / call check-in endpoint -> Sets `checked_in = true` in DB.
- [ ] Simulate 15-minute no-show -> Background job auto-cancels booking and releases slot.

---

## ⏳ Phase 7: Slot Waitlist & Priority Notification Queue

### 7.1 Overview & Requirements
Allow students to join a waitlist for fully booked slots. When a slot is cancelled, the system automatically emails the first waitlisted student with a 15-minute priority claim window.

### 7.2 Database Migration (`010_create_waitlists_table.sql`)
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

CREATE INDEX idx_waitlists_slot_queue ON booking_waitlists (slot_id, created_at);
```

### 7.3 API Contracts Added
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/slots/:id/waitlist` | Signed In | Join waitlist for a booked slot |
| `DELETE` | `/api/slots/:id/waitlist` | Signed In | Leave waitlist |
| `POST` | `/api/slots/:id/claim-waitlist` | Signed In | Claim slot within 15-min priority window |

### 7.4 Phase 7 AI Prompt

```text
Implement Phase 7: Slot Waitlist Queue & Priority Claims.

1. Create migration for `booking_waitlists` table.
2. Add `POST /api/slots/:id/waitlist` (student joins waitlist if slot is booked) and `DELETE /api/slots/:id/waitlist`.
3. Update cancellation service (`POST /api/bookings/:id/cancel`):
   - When a booking is cancelled, check `booking_waitlists` for the oldest record where `notified_at IS NULL`.
   - Update `notified_at = NOW()` and `expires_at = NOW() + INTERVAL '15 minutes'`.
   - Send email to waitlisted student with a 15-minute claim link.
4. Add `POST /api/slots/:id/claim-waitlist`:
   - Validate student was notified and `NOW() <= expires_at`.
   - Create CONFIRMED booking and remove entry from waitlist.
5. Add "Join Waitlist" button to React SlotPicker for booked slots.
```

### 7.5 Verification Checklist
- [ ] Slot is booked -> Student B clicks "Join Waitlist".
- [ ] Student A cancels booking -> Student B receives priority claim email.
- [ ] Student B claims slot within 15 mins -> Booking confirmed for Student B.

---

## 🎯 Complete Master `.env` Reference

```env
# Phase 1: Core App Config
PORT=4000
NODE_ENV=development
APP_ORIGIN=http://localhost:5173
DATABASE_URL=postgres://postgres:password@localhost:5432/campus_booking_dev
TEST_DATABASE_URL=postgres://postgres:password@localhost:5432/campus_booking_test
SESSION_SECRET=super_secret_random_string_32_chars_long

# Phase 2: SMTP Credentials
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM_NAME="Campus Resource Booking"
MAIL_FROM_ADDRESS="no-reply@campus.edu"

# Phase 4 & 6: Cron & QR Security
REMINDER_CRON_INTERVAL="*/5 * * * *"
CHECKIN_TOKEN_SECRET=super_secret_hmac_key_for_qr_codes
```
