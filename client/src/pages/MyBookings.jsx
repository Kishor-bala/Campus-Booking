import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { StatusMessage } from '../components/StatusMessage';

import { formatSlotWindow, formatDateReadable } from '../utils/timeFormat';

export const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming', 'past', 'cancelled'

  // Cancellation modal state
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  const fetchMyBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/bookings/mine');
      setBookings(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load booking history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBookings();
  }, []);

  const handleCancelSubmit = async () => {
    if (!cancellingBooking) return;
    setCancelLoading(true);
    setCancelError(null);

    try {
      await apiFetch(`/api/bookings/${cancellingBooking.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setCancellingBooking(null);
      fetchMyBookings();
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel booking.');
    } finally {
      setCancelLoading(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'cancelled') return b.status === 'CANCELLED';
    if (activeTab === 'past') return b.status === 'CONFIRMED' && b.calculatedState === 'past';
    return b.status === 'CONFIRMED' && (b.calculatedState === 'upcoming' || b.calculatedState === 'in_progress');
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>My Reservations</h2>
        <p>Manage your upcoming campus bookings and view reservation history.</p>
      </div>

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming Bookings
        </button>
        <button
          className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
          onClick={() => setActiveTab('past')}
        >
          Past History
        </button>
        <button
          className={`tab-btn ${activeTab === 'cancelled' ? 'active' : ''}`}
          onClick={() => setActiveTab('cancelled')}
        >
          Cancelled Bookings
        </button>
      </div>

      <StatusMessage type="error" message={error} onDismiss={() => setError(null)} />

      {loading ? (
        <div className="loading-state">Loading reservations...</div>
      ) : filteredBookings.length === 0 ? (
        <div className="empty-state">No {activeTab} bookings found.</div>
      ) : (
        <div className="bookings-list">
          {filteredBookings.map((b) => (
            <div key={b.id} className="booking-card">
              <div className="booking-card-header">
                <div>
                  <span className="category-badge">{b.resource.category}</span>
                  <h4 className="booking-title">{b.resource.name}</h4>
                </div>
                <span className={`status-badge status-${b.calculatedState}`}>
                  {b.calculatedState.toUpperCase()}
                </span>
              </div>

              <div className="booking-details font-mono text-xs">
                <div>📍 <strong>Location:</strong> {b.resource.location}</div>
                <div>📅 <strong>Date:</strong> {formatDateReadable(b.slot.bookingDate)}</div>
                <div>🕒 <strong>Time (IST):</strong> Slot #{b.slot.slotIndex + 1} ({formatSlotWindow(b.slot.startsAt, b.slot.endsAt)})</div>
                <div>📝 <strong>Purpose:</strong> {b.purpose}</div>
                <div>🔖 <strong>Reference ID:</strong> {b.id}</div>
                {b.cancellationReason && (
                  <div className="cancellation-reason">
                    <strong>Cancellation Reason:</strong> {b.cancellationReason}
                  </div>
                )}
              </div>

              {b.status === 'CONFIRMED' && (b.calculatedState === 'upcoming' || b.calculatedState === 'in_progress') && (
                <div className="booking-actions">
                  <button
                    onClick={() => setCancellingBooking(b)}
                    className="btn-cancel"
                  >
                    Cancel Booking
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cancellation Modal */}
      {cancellingBooking && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Confirm Cancellation</h3>
            <p>
              Are you sure you want to cancel your reservation for <strong>{cancellingBooking.resource.name}</strong> on {cancellingBooking.slot.bookingDate}?
            </p>
            <StatusMessage type="error" message={cancelError} onDismiss={() => setCancelError(null)} />

            <div className="modal-actions">
              <button
                onClick={() => setCancellingBooking(null)}
                disabled={cancelLoading}
                className="btn-secondary"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelSubmit}
                disabled={cancelLoading}
                className="btn-danger"
              >
                {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
