import React, { useState } from 'react';
import { apiFetch } from '../api/client';
import { StatusMessage } from './StatusMessage';
import { formatSlotWindow, formatDateReadable } from '../utils/timeFormat';

export const BookingForm = ({ selectedSlot, onBookingSuccess }) => {
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (!selectedSlot) {
    return (
      <div className="info-box-prompt">
        <span className="info-icon">👈</span>
        <div>
          <strong>Select a Time Slot Above</strong>
          <p>Click on any available green slot card above to confirm your reservation details.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (purpose.trim().length < 10) {
      setError('Purpose must be at least 10 characters long.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await apiFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          slotId: selectedSlot.id,
          purpose: purpose.trim(),
        }),
      });

      setSuccess(`Booking Confirmed! Reference ID: ${res.data.id}`);
      setPurpose('');
      if (onBookingSuccess) {
        onBookingSuccess(res.data);
      }
    } catch (err) {
      if (err.code === 'SLOT_ALREADY_BOOKED' || err.status === 409) {
        setError('This slot was just booked by another user. Please choose another slot.');
      } else {
        setError(err.message || 'Failed to complete booking.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="booking-form-card">
      <div className="card-header-accent">
        <h3>Confirm Reservation Details</h3>
      </div>
      <StatusMessage type="error" message={error} onDismiss={() => setError(null)} />
      <StatusMessage type="success" message={success} onDismiss={() => setSuccess(null)} />

      <form onSubmit={handleSubmit} className="booking-form">
        <div className="selected-slot-banner">
          <div className="banner-item">
            <span className="banner-label">Date</span>
            <span className="banner-value">{formatDateReadable(selectedSlot.bookingDate)}</span>
          </div>
          <div className="banner-item">
            <span className="banner-label">Time Window</span>
            <span className="banner-value highlight">{formatSlotWindow(selectedSlot.startsAt, selectedSlot.endsAt)}</span>
          </div>
          <div className="banner-item">
            <span className="banner-label">Slot</span>
            <span className="banner-value">Slot #{selectedSlot.slotIndex + 1}</span>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="purpose">Booking Purpose (10 - 300 characters):</label>
          <textarea
            id="purpose"
            rows="3"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Describe why you need this resource (e.g. Group study session for CS exam)..."
            required
            disabled={submitting}
          />
        </div>

        <button type="submit" disabled={submitting || purpose.trim().length < 10} className="btn-primary-lg">
          {submitting ? 'Confirming Reservation...' : 'Confirm & Book Slot'}
        </button>
      </form>
    </div>
  );
};
