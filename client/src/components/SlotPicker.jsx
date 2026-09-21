import React from 'react';
import { formatSlotWindow } from '../utils/timeFormat';

export const SlotPicker = ({ slots, selectedSlotId, onSelectSlot, loading }) => {
  if (loading) {
    return <div className="loading-state">Loading slot grid...</div>;
  }

  if (!slots || slots.length === 0) {
    return <div className="empty-state">No slots published for this date.</div>;
  }

  return (
    <div className="slot-grid">
      {slots.map((slot) => {
        const isSelected = selectedSlotId === slot.id;
        const isAvailable = slot.state === 'available';

        const stateClasses = {
          available: 'badge-available',
          booked: 'badge-booked',
          closed: 'badge-closed',
          past: 'badge-past',
        };

        const stateLabels = {
          available: 'Available',
          booked: 'Booked',
          closed: 'Closed',
          past: 'Past',
        };

        return (
          <div
            key={slot.id}
            className={`slot-card ${stateClasses[slot.state]} ${isSelected ? 'selected' : ''} ${!isAvailable ? 'disabled' : ''}`}
            onClick={() => isAvailable && onSelectSlot(slot)}
          >
            <div className="slot-header">
              <span className="slot-index-pill">Slot {slot.slotIndex + 1}</span>
              <span className={`slot-status-pill ${stateClasses[slot.state]}`}>
                {stateLabels[slot.state]}
              </span>
            </div>
            <div className="slot-time-text">
              {formatSlotWindow(slot.startsAt, slot.endsAt)}
            </div>
            {isSelected && <div className="selected-checkmark">✓ Selected for Reservation</div>}
          </div>
        );
      })}
    </div>
  );
};
