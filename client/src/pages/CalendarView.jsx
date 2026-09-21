import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { StatusMessage } from '../components/StatusMessage';

import { formatSlotWindow } from '../utils/timeFormat';

export const CalendarView = () => {
  const [resources, setResources] = useState([]);
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadResources = async () => {
      try {
        const res = await apiFetch('/api/resources?limit=20');
        setResources(res.data);
        if (res.data.length > 0) {
          setSelectedResourceId(res.data[0].id);
        }
      } catch (err) {
        setError('Failed to load resources.');
      }
    };
    loadResources();
  }, []);

  useEffect(() => {
    if (!selectedResourceId || !selectedDate) return;
    const loadSlots = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/api/resources/${selectedResourceId}/slots?date=${selectedDate}`);
        setSlots(res.data);
      } catch (err) {
        setError('Failed to load calendar schedule.');
      } finally {
        setLoading(false);
      }
    };
    loadSlots();
  }, [selectedResourceId, selectedDate]);

  const selectedResource = resources.find((r) => r.id === selectedResourceId);

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Campus Interactive Calendar</h2>
        <p>Visual 24/7 availability timeline across campus resources (Asia/Kolkata IST).</p>
      </div>

      <div className="calendar-controls-bar">
        <div className="form-group">
          <label>Select Space:</label>
          <select value={selectedResourceId} onChange={(e) => setSelectedResourceId(e.target.value)}>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.category}) &bull; {r.location}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Select Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      <StatusMessage type="error" message={error} onDismiss={() => setError(null)} />

      {selectedResource && (
        <div className="calendar-space-banner">
          <h3>{selectedResource.name}</h3>
          <p>📍 {selectedResource.location} &bull; 👥 Capacity: {selectedResource.capacity}</p>
        </div>
      )}

      {/* Calendar Timeline Grid */}
      <div className="calendar-container">
        <div className="timeline-legend">
          <span className="legend-item"><span className="dot dot-available" /> Available</span>
          <span className="legend-item"><span className="dot dot-booked" /> Booked</span>
          <span className="legend-item"><span className="dot dot-closed" /> Closed</span>
          <span className="legend-item"><span className="dot dot-past" /> Past</span>
        </div>

        {loading ? (
          <div className="loading-state">Loading timeline...</div>
        ) : (
          <div className="calendar-timeline-grid">
            {slots.map((slot) => {
              const bgClasses = {
                available: 'timeline-available',
                booked: 'timeline-booked',
                closed: 'timeline-closed',
                past: 'timeline-past',
              };

              return (
                <div key={slot.id} className={`timeline-slot-box ${bgClasses[slot.state]}`}>
                  <div className="time-range">
                    Slot #{slot.slotIndex + 1}: {formatSlotWindow(slot.startsAt, slot.endsAt)}
                  </div>
                  <div className="slot-badge">{slot.state.toUpperCase()}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
