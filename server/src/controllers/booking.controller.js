import { z } from 'zod';
import { pool } from '../db/index.js';
import { sendBookingConfirmationEmail, sendBookingCancellationEmail } from '../services/mailer.service.js';

const createBookingSchema = z.object({
  slotId: z.string().uuid(),
  purpose: z.string().trim().min(10).max(300),
});

const cancelBookingSchema = z.object({
  reason: z.string().trim().min(5).max(300).optional(),
});

// Helper: Calculate IST slot start/end Date objects
const getSlotDates = (bookingDateStr, slotIndex) => {
  const startHour = 9 + slotIndex;
  const endHour = startHour + 1;
  const pad = (n) => String(n).padStart(2, '0');

  const startDate = new Date(`${bookingDateStr}T${pad(startHour)}:00:00+05:30`);
  const endDate = new Date(`${bookingDateStr}T${pad(endHour)}:00:00+05:30`);

  return { startDate, endDate, startsAt: `${bookingDateStr}T${pad(startHour)}:00:00+05:30`, endsAt: `${bookingDateStr}T${pad(endHour)}:00:00+05:30` };
};

// 1. Transactional Concurrency-Safe Booking Engine
export const createBooking = async (req, res, next) => {
  const parseResult = createBookingSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Purpose must be between 10 and 300 characters',
        details: parseResult.error.errors,
      },
    });
  }

  const { slotId, purpose } = parseResult.data;
  const userId = req.user.id;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock Order 1: Lock Resource
    const resourceRes = await client.query(
      `SELECT r.id, r.name, r.category, r.location, r.is_active
       FROM resources r
       JOIN resource_slots s ON s.resource_id = r.id
       WHERE s.id = $1
       FOR UPDATE OF r`,
      [slotId]
    );

    if (resourceRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: { code: 'SLOT_NOT_FOUND', message: 'Slot or associated resource not found' },
      });
    }

    const resource = resourceRes.rows[0];
    if (!resource.is_active) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: { code: 'RESOURCE_INACTIVE', message: 'This resource is currently inactive' },
      });
    }

    // Lock Order 2: Lock Resource Slot
    const slotRes = await client.query(
      `SELECT id, resource_id, booking_date, slot_index, is_open
       FROM resource_slots
       WHERE id = $1
       FOR UPDATE`,
      [slotId]
    );

    const slot = slotRes.rows[0];
    if (!slot.is_open) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: { code: 'SLOT_CLOSED', message: 'This slot is currently closed' },
      });
    }

    // Validate slot start time is in the future
    const { startDate, startsAt, endsAt } = getSlotDates(slot.booking_date, slot.slot_index);
    if (startDate < new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: { code: 'SLOT_IN_PAST', message: 'Cannot book a slot that has already started or passed' },
      });
    }

    // Insert CONFIRMED booking
    const bookingRes = await client.query(
      `INSERT INTO bookings (user_id, slot_id, purpose, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, slot_id, purpose, status, created_at`,
      [userId, slotId, purpose, 'CONFIRMED']
    );

    const booking = bookingRes.rows[0];

    // Insert CREATED audit event
    await client.query(
      `INSERT INTO booking_events (booking_id, actor_user_id, event_type, details)
       VALUES ($1, $2, 'CREATED', $3)`,
      [booking.id, userId, JSON.stringify({ purpose, slotId })]
    );

    await client.query('COMMIT');

    // Trigger async confirmation email dispatch (Phase 7)
    sendBookingConfirmationEmail({
      booking,
      user: req.user,
      resource,
      slot: { ...slot, startsAt, endsAt },
    });

    return res.status(201).json({ data: booking });
  } catch (err) {
    await client.query('ROLLBACK');

    // Map Partial Unique Index Violation to HTTP 409 SLOT_ALREADY_BOOKED
    if (err.code === '23505' && (err.constraint === 'one_confirmed_booking_per_slot' || err.message.includes('one_confirmed_booking_per_slot'))) {
      return res.status(409).json({
        error: {
          code: 'SLOT_ALREADY_BOOKED',
          message: 'This slot was just booked by another user.',
        },
      });
    }

    next(err);
  } finally {
    client.release();
  }
};

// 2. Personal Booking History
export const getMyBookings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT b.id, b.user_id, b.slot_id, b.purpose, b.status, b.created_at, b.cancelled_at, b.cancellation_reason,
              s.booking_date, s.slot_index, s.is_open,
              r.id AS resource_id, r.name AS resource_name, r.category AS resource_category, r.location AS resource_location
       FROM bookings b
       JOIN resource_slots s ON s.id = b.slot_id
       JOIN resources r ON r.id = s.resource_id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [userId]
    );

    const now = new Date();
    const formattedBookings = result.rows.map((row) => {
      const { startDate, endDate, startsAt, endsAt } = getSlotDates(row.booking_date, row.slot_index);
      let calculatedState = 'upcoming';
      if (row.status === 'CANCELLED') {
        calculatedState = 'cancelled';
      } else if (now > endDate) {
        calculatedState = 'past';
      } else if (now >= startDate && now <= endDate) {
        calculatedState = 'in_progress';
      }

      return {
        id: row.id,
        userId: row.user_id,
        slotId: row.slot_id,
        purpose: row.purpose,
        status: row.status,
        calculatedState,
        createdAt: row.created_at,
        cancelledAt: row.cancelled_at,
        cancellationReason: row.cancellation_reason,
        resource: {
          id: row.resource_id,
          name: row.resource_name,
          category: row.resource_category,
          location: row.resource_location,
        },
        slot: {
          bookingDate: row.booking_date,
          slotIndex: row.slot_index,
          startsAt,
          endsAt,
        },
      };
    });

    return res.status(200).json({ data: formattedBookings });
  } catch (err) {
    next(err);
  }
};

// 3. Cancel Booking (Owner / Admin)
export const cancelBooking = async (req, res, next) => {
  const { id } = req.params;
  const parseResult = cancelBookingSchema.safeParse(req.body);
  const reasonInput = parseResult.success ? parseResult.data.reason : null;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const bookingRes = await client.query(
      `SELECT b.id, b.user_id, b.slot_id, b.status, b.purpose, b.cancelled_at, b.cancellation_reason,
              s.booking_date, s.slot_index, s.resource_id,
              u.name AS user_name, u.email AS user_email,
              r.name AS resource_name, r.category AS resource_category, r.location AS resource_location
       FROM bookings b
       JOIN resource_slots s ON s.id = b.slot_id
       JOIN resources r ON r.id = s.resource_id
       JOIN users u ON u.id = b.user_id
       WHERE b.id = $1
       FOR UPDATE OF b`,
      [id]
    );

    if (bookingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' },
      });
    }

    const booking = bookingRes.rows[0];
    const isOwner = booking.user_id === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You are not authorized to cancel this booking' },
      });
    }

    // IDEMPOTENCY: If booking is already CANCELLED, return existing result without duplicate audit events
    if (booking.status === 'CANCELLED') {
      await client.query('COMMIT');
      return res.status(200).json({
        data: {
          id: booking.id,
          status: 'CANCELLED',
          cancelledAt: booking.cancelled_at,
          cancellationReason: booking.cancellation_reason,
          message: 'Booking was already cancelled',
        },
      });
    }

    const { startDate, endDate, startsAt, endsAt } = getSlotDates(booking.booking_date, booking.slot_index);
    const now = new Date();

    // Student Cancellation Policy: Must be before slot starts
    if (!isAdmin && isOwner && now >= startDate) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: { code: 'CANNOT_CANCEL_PAST_BOOKING', message: 'Students can only cancel bookings before the slot starts.' },
      });
    }

    // Admin Cancellation Policy: Must supply a cancellation reason and be before slot ends
    if (isAdmin) {
      if (!reasonInput || reasonInput.trim().length < 5) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: { code: 'REASON_REQUIRED', message: 'Administrators must provide a cancellation reason (min 5 characters).' },
        });
      }
      if (now > endDate) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: { code: 'CANNOT_CANCEL_FINISHED_BOOKING', message: 'Cannot cancel a booking that has already ended.' },
        });
      }
    }

    const finalReason = reasonInput || 'Cancelled by student prior to slot start';
    const cancelledByRole = isAdmin ? `Administrator (${req.user.name})` : `Student (${req.user.name})`;

    // Update status to CANCELLED
    const updateRes = await client.query(
      `UPDATE bookings
       SET status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP, cancelled_by = $1, cancellation_reason = $2
       WHERE id = $3
       RETURNING id, status, cancelled_at, cancellation_reason`,
      [req.user.id, finalReason, id]
    );

    // Insert CANCELLED audit event
    await client.query(
      `INSERT INTO booking_events (booking_id, actor_user_id, event_type, details)
       VALUES ($1, $2, 'CANCELLED', $3)`,
      [id, req.user.id, JSON.stringify({ reason: finalReason, cancelledByRole })]
    );

    await client.query('COMMIT');

    // Trigger async cancellation email dispatch (Phase 7)
    sendBookingCancellationEmail({
      booking: updateRes.rows[0],
      user: { name: booking.user_name, email: booking.user_email },
      resource: { name: booking.resource_name },
      slot: { booking_date: booking.booking_date, startsAt, endsAt },
      reason: finalReason,
      cancelledBy: cancelledByRole,
    });

    return res.status(200).json({ data: updateRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// 4. Admin Filter All Bookings
export const adminListBookings = async (req, res, next) => {
  try {
    const status = req.query.status ? req.query.status.trim().toUpperCase() : null;
    let query = `
      SELECT b.id, b.user_id, b.slot_id, b.purpose, b.status, b.created_at, b.cancelled_at, b.cancellation_reason,
             u.name AS user_name, u.email AS user_email,
             r.name AS resource_name, r.category AS resource_category, r.location AS resource_location,
             s.booking_date, s.slot_index
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      JOIN resource_slots s ON s.id = b.slot_id
      JOIN resources r ON r.id = s.resource_id
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` WHERE b.status = $1`;
    }

    query += ` ORDER BY b.created_at DESC LIMIT 100`;

    const result = await pool.query(query, params);
    const formatted = result.rows.map((row) => {
      const { startsAt, endsAt } = getSlotDates(row.booking_date, row.slot_index);
      return {
        id: row.id,
        user: { id: row.user_id, name: row.user_name, email: row.user_email },
        resource: { name: row.resource_name, category: row.resource_category, location: row.resource_location },
        slot: { bookingDate: row.booking_date, slotIndex: row.slot_index, startsAt, endsAt },
        purpose: row.purpose,
        status: row.status,
        createdAt: row.created_at,
        cancelledAt: row.cancelled_at,
        cancellationReason: row.cancellation_reason,
      };
    });

    return res.status(200).json({ data: formatted });
  } catch (err) {
    next(err);
  }
};

// 5. Admin View Booking Audit Log History
export const adminGetBookingEvents = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT e.id, e.booking_id, e.actor_user_id, e.event_type, e.occurred_at, e.details,
              u.name AS actor_name, u.email AS actor_email, u.role AS actor_role
       FROM booking_events e
       JOIN users u ON u.id = e.actor_user_id
       WHERE e.booking_id = $1
       ORDER BY e.occurred_at ASC`,
      [id]
    );

    return res.status(200).json({ data: result.rows });
  } catch (err) {
    next(err);
  }
};
