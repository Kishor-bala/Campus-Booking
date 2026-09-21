import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { SlotPicker } from '../components/SlotPicker';
import { BookingForm } from '../components/BookingForm';
import { StatusMessage } from '../components/StatusMessage';

export const ResourceDetail = () => {
  const { id } = useParams();
  const [resource, setResource] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [loadingResource, setLoadingResource] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [error, setError] = useState(null);

  const fetchResource = async () => {
    setLoadingResource(true);
    try {
      const res = await apiFetch(`/api/resources/${id}`);
      setResource(res.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch resource details.');
    } finally {
      setLoadingResource(false);
    }
  };

  const fetchSlots = async () => {
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const res = await apiFetch(`/api/resources/${id}/slots?date=${selectedDate}`);
      setSlots(res.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch slot availability.');
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchResource();
  }, [id]);

  useEffect(() => {
    fetchSlots();
  }, [id, selectedDate]);

  const handleBookingSuccess = () => {
    fetchSlots();
  };

  if (loadingResource) return <div className="loading-state">Loading resource details...</div>;
  if (!resource) return <div className="error-state">Resource not found. <Link to="/resources">Return to Catalogue</Link></div>;

  return (
    <div className="page-container">
      <Link to="/resources" className="back-link">&larr; Back to Catalogue</Link>

      <div className="resource-header-card">
        <div className="header-meta">
          <span className="category-badge">{resource.category}</span>
          <span className="location-tag">📍 {resource.location}</span>
          <span className="capacity-tag">👥 Fits {resource.capacity} people</span>
        </div>
        <h2>{resource.name}</h2>
        <p className="description">{resource.description}</p>
        <div className="rules-box">
          <strong>Resource Rules:</strong> {resource.rules}
        </div>
      </div>

      <StatusMessage type="error" message={error} onDismiss={() => setError(null)} />

      <div className="availability-section">
        <div className="section-title-bar">
          <h3>Select Booking Date & Slot</h3>
          <div className="date-picker-group">
            <label htmlFor="booking-date">Date (Asia/Kolkata):</label>
            <input
              id="booking-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <SlotPicker
          slots={slots}
          selectedSlotId={selectedSlot?.id}
          onSelectSlot={setSelectedSlot}
          loading={loadingSlots}
        />
      </div>

      <div className="booking-section">
        <BookingForm
          selectedSlot={selectedSlot}
          onBookingSuccess={handleBookingSuccess}
        />
      </div>
    </div>
  );
};
