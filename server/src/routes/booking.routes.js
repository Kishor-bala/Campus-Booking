import { Router } from 'express';
import {
  createBooking,
  getMyBookings,
  cancelBooking,
  adminListBookings,
  adminGetBookingEvents,
} from '../controllers/booking.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Student / Signed In Booking Routes
router.post('/bookings', requireAuth, createBooking);
router.get('/bookings/mine', requireAuth, getMyBookings);
router.post('/bookings/:id/cancel', requireAuth, cancelBooking);

// Admin Booking Routes
router.get('/admin/bookings', requireAuth, requireRole('ADMIN'), adminListBookings);
router.get('/admin/bookings/:id/events', requireAuth, requireRole('ADMIN'), adminGetBookingEvents);

export default router;
