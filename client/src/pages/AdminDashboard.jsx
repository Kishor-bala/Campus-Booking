import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { StatusMessage } from '../components/StatusMessage';
import { formatSlotWindow } from '../utils/timeFormat';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('resources'); // 'resources', 'slots', 'bookings'
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Resources state
  const [resources, setResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [newResource, setNewResource] = useState({
    name: '',
    category: 'Study Room',
    description: '',
    location: '',
    capacity: 4,
    rules: '',
  });
  const [creatingResource, setCreatingResource] = useState(false);

  // Slot Generation State
  const [genResourceId, setGenResourceId] = useState('');
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [genLoading, setGenLoading] = useState(false);

  // Slots Management State
  const [selectedResId, setSelectedResId] = useState('');
  const [selectedSlotDate, setSelectedSlotDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [slotsList, setSlotsList] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Bookings State
  const [adminBookings, setAdminBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [adminCancelBooking, setAdminCancelBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingLoading, setCancellingLoading] = useState(false);

  // Audit Events Modal State
  const [selectedBookingForEvents, setSelectedBookingForEvents] = useState(null);
  const [auditEvents, setAuditEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Load Resources
  const fetchResources = async () => {
    setLoadingResources(true);
    try {
      const res = await apiFetch('/api/admin/resources');
      setResources(res.data);
      if (res.data.length > 0 && !selectedResId) {
        setSelectedResId(res.data[0].id);
        setGenResourceId(res.data[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load resources.');
    } finally {
      setLoadingResources(false);
    }
  };

  // Load Slots
  const fetchSlots = async () => {
    if (!selectedResId || !selectedSlotDate) return;
    setLoadingSlots(true);
    try {
      const res = await apiFetch(`/api/resources/${selectedResId}/slots?date=${selectedSlotDate}`);
      setSlotsList(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load slot availability.');
    } finally {
      setLoadingSlots(false);
    }
  };

  // Load Bookings
  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const res = await apiFetch('/api/admin/bookings');
      setAdminBookings(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load bookings.');
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  useEffect(() => {
    if (activeTab === 'slots') fetchSlots();
    if (activeTab === 'bookings') fetchBookings();
  }, [activeTab, selectedResId, selectedSlotDate]);

  // Create Resource
  const handleCreateResource = async (e) => {
    e.preventDefault();
    setCreatingResource(true);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch('/api/admin/resources', {
        method: 'POST',
        body: JSON.stringify({
          ...newResource,
          capacity: Number(newResource.capacity),
        }),
      });
      setSuccess('Resource created successfully!');
      setNewResource({ name: '', category: 'Study Room', description: '', location: '', capacity: 4, rules: '' });
      fetchResources();
    } catch (err) {
      setError(err.message || 'Failed to create resource.');
    } finally {
      setCreatingResource(false);
    }
  };

  // Toggle Resource Active State
  const handleToggleResourceActive = async (resource) => {
    setError(null);
    setSuccess(null);
    const newStatus = !resource.is_active;
    try {
      await apiFetch(`/api/admin/resources/${resource.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: newStatus }),
      });
      setSuccess(`Resource ${resource.name} ${newStatus ? 'activated' : 'deactivated'}.`);
      fetchResources();
    } catch (err) {
      if (err.status === 409 || err.code === 'RESOURCE_HAS_ACTIVE_BOOKINGS') {
        setError('Cannot deactivate resource with outstanding confirmed bookings. Cancel affected bookings first.');
      } else {
        setError(err.message || 'Failed to update resource.');
      }
    }
  };

  // Generate Slots
  const handleGenerateSlots = async (e) => {
    e.preventDefault();
    if (!genResourceId) return;
    setGenLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await apiFetch(`/api/admin/resources/${genResourceId}/slots/generate`, {
        method: 'POST',
        body: JSON.stringify({ fromDate, toDate }),
      });
      setSuccess(`Slots generated successfully (${res.data.totalSlotsEvaluated} evaluated).`);
      if (activeTab === 'slots') fetchSlots();
    } catch (err) {
      setError(err.message || 'Failed to generate slots.');
    } finally {
      setGenLoading(false);
    }
  };

  // Toggle Slot Open/Closed
  const handleToggleSlotOpen = async (slot) => {
    setError(null);
    setSuccess(null);
    const newOpenState = !slot.isOpen;
    try {
      await apiFetch(`/api/admin/slots/${slot.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isOpen: newOpenState }),
      });
      setSuccess(`Slot ${newOpenState ? 'opened' : 'closed'} successfully.`);
      fetchSlots();
    } catch (err) {
      if (err.status === 409 || err.code === 'SLOT_HAS_ACTIVE_BOOKING') {
        setError('Cannot close slot with an outstanding confirmed booking. Cancel the booking first.');
      } else {
        setError(err.message || 'Failed to update slot.');
      }
    }
  };

  // Admin Cancel Booking
  const handleAdminCancelBooking = async () => {
    if (!adminCancelBooking || cancelReason.trim().length < 5) {
      setError('A cancellation reason of at least 5 characters is required.');
      return;
    }

    setCancellingLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/api/bookings/${adminCancelBooking.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      setSuccess('Booking cancelled successfully.');
      setAdminCancelBooking(null);
      setCancelReason('');
      fetchBookings();
    } catch (err) {
      setError(err.message || 'Failed to cancel booking.');
    } finally {
      setCancellingLoading(false);
    }
  };

  // View Audit Events
  const handleViewEvents = async (booking) => {
    setSelectedBookingForEvents(booking);
    setLoadingEvents(true);
    try {
      const res = await apiFetch(`/api/admin/bookings/${booking.id}/events`);
      setAuditEvents(res.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch audit events.');
    } finally {
      setLoadingEvents(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Administrator Control Panel</h2>
        <p>Manage resources, publish/close slots, oversee bookings, and inspect audit logs.</p>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'resources' ? 'active' : ''}`} onClick={() => setActiveTab('resources')}>
          Manage Resources
        </button>
        <button className={`tab-btn ${activeTab === 'slots' ? 'active' : ''}`} onClick={() => setActiveTab('slots')}>
          Manage Slots
        </button>
        <button className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`} onClick={() => setActiveTab('bookings')}>
          All Bookings & Audits
        </button>
      </div>

      <StatusMessage type="error" message={error} onDismiss={() => setError(null)} />
      <StatusMessage type="success" message={success} onDismiss={() => setSuccess(null)} />

      {/* TAB 1: RESOURCES */}
      {activeTab === 'resources' && (
        <div className="admin-tab-content">
          <div className="admin-grid">
            {/* Create Resource Card */}
            <div className="admin-card">
              <h3>Create New Resource</h3>
              <form onSubmit={handleCreateResource} className="admin-form">
                <div className="form-group">
                  <label>Resource Name</label>
                  <input
                    type="text"
                    value={newResource.name}
                    onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                    placeholder="e.g. Projector 3"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={newResource.category}
                    onChange={(e) => setNewResource({ ...newResource, category: e.target.value })}
                  >
                    <option value="Study Room">Study Room</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Laboratory">Laboratory</option>
                    <option value="Sports">Sports</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={newResource.location}
                    onChange={(e) => setNewResource({ ...newResource, location: e.target.value })}
                    placeholder="e.g. Block A, Room 101"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={newResource.capacity}
                    onChange={(e) => setNewResource({ ...newResource, capacity: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    rows="2"
                    value={newResource.description}
                    onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Rules</label>
                  <input
                    type="text"
                    value={newResource.rules}
                    onChange={(e) => setNewResource({ ...newResource, rules: e.target.value })}
                    placeholder="e.g. Leave clean after use"
                    required
                  />
                </div>
                <button type="submit" disabled={creatingResource} className="btn-primary">
                  {creatingResource ? 'Creating...' : 'Create Resource'}
                </button>
              </form>
            </div>

            {/* Generate Slots Card */}
            <div className="admin-card">
              <h3>Generate Canonical Slots</h3>
              <form onSubmit={handleGenerateSlots} className="admin-form">
                <div className="form-group">
                  <label>Target Resource</label>
                  <select value={genResourceId} onChange={(e) => setGenResourceId(e.target.value)} required>
                    {resources.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.category})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>From Date</label>
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>To Date</label>
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} required />
                </div>
                <button type="submit" disabled={genLoading} className="btn-secondary">
                  {genLoading ? 'Generating...' : 'Publish Slots (09:00 - 17:00 IST)'}
                </button>
              </form>
            </div>
          </div>

          {/* Resources List */}
          <h3 className="section-title">All System Resources</h3>
          {loadingResources ? (
            <div>Loading resources...</div>
          ) : (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Capacity</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.name}</strong></td>
                      <td>{r.category}</td>
                      <td>{r.location}</td>
                      <td>{r.capacity}</td>
                      <td>
                        <span className={`status-pill ${r.is_active ? 'pill-active' : 'pill-inactive'}`}>
                          {r.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleResourceActive(r)}
                          className={r.is_active ? 'btn-danger-sm' : 'btn-success-sm'}
                        >
                          {r.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SLOTS */}
      {activeTab === 'slots' && (
        <div className="admin-tab-content">
          <div className="filter-row">
            <div className="form-group">
              <label>Select Resource:</label>
              <select value={selectedResId} onChange={(e) => setSelectedResId(e.target.value)}>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Select Date:</label>
              <input type="date" value={selectedSlotDate} onChange={(e) => setSelectedSlotDate(e.target.value)} />
            </div>
          </div>

          {loadingSlots ? (
            <div>Loading slots...</div>
          ) : (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Slot Index</th>
                    <th>IST Time Window</th>
                    <th>Open Status</th>
                    <th>Booking State</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {slotsList.map((slot) => (
                    <tr key={slot.id}>
                      <td>Slot #{slot.slotIndex + 1}</td>
                      <td>{formatSlotWindow(slot.startsAt, slot.endsAt)}</td>
                      <td>
                        <span className={`status-pill ${slot.isOpen ? 'pill-active' : 'pill-inactive'}`}>
                          {slot.isOpen ? 'Open' : 'Closed'}
                        </span>
                      </td>
                      <td>{slot.state.toUpperCase()}</td>
                      <td>
                        <button onClick={() => handleToggleSlotOpen(slot)} className="btn-secondary-sm">
                          {slot.isOpen ? 'Close Slot' : 'Open Slot'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BOOKINGS & AUDIT EVENTS */}
      {activeTab === 'bookings' && (
        <div className="admin-tab-content">
          {loadingBookings ? (
            <div>Loading bookings...</div>
          ) : (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Booking Ref</th>
                    <th>User</th>
                    <th>Resource</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminBookings.map((b) => (
                    <tr key={b.id}>
                      <td className="font-mono text-xs">{b.id.substring(0, 8)}...</td>
                      <td>{b.user.name} ({b.user.email})</td>
                      <td>{b.resource.name}</td>
                      <td>{b.slot.bookingDate} ({b.slot.startsAt.split('T')[1].substring(0, 5)} IST)</td>
                      <td>
                        <span className={`status-pill pill-${b.status.toLowerCase()}`}>{b.status}</span>
                      </td>
                      <td>
                        <div className="btn-group">
                          {b.status === 'CONFIRMED' && (
                            <button onClick={() => setAdminCancelBooking(b)} className="btn-danger-sm">
                              Cancel
                            </button>
                          )}
                          <button onClick={() => handleViewEvents(b)} className="btn-secondary-sm">
                            Audit History
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Admin Cancel Modal */}
      {adminCancelBooking && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Admin Cancellation</h3>
            <p>
              Cancelling booking for <strong>{adminCancelBooking.user.name}</strong> ({adminCancelBooking.resource.name}).
            </p>
            <div className="form-group">
              <label>Mandatory Cancellation Reason (min 5 chars):</label>
              <textarea
                rows="3"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Specify reason for cancelling this booking..."
                required
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => setAdminCancelBooking(null)} className="btn-secondary">
                Back
              </button>
              <button
                onClick={handleAdminCancelBooking}
                disabled={cancellingLoading || cancelReason.trim().length < 5}
                className="btn-danger"
              >
                {cancellingLoading ? 'Cancelling...' : 'Confirm Admin Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit History Modal */}
      {selectedBookingForEvents && (
        <div className="modal-overlay">
          <div className="modal-card modal-lg">
            <h3>Booking Audit Log History</h3>
            <p className="font-mono text-xs">Reference: {selectedBookingForEvents.id}</p>

            {loadingEvents ? (
              <div>Loading audit events...</div>
            ) : (
              <div className="events-timeline">
                {auditEvents.map((evt) => (
                  <div key={evt.id} className="timeline-item">
                    <div className="timeline-badge">{evt.event_type}</div>
                    <div className="timeline-content">
                      <div className="timeline-actor">
                        Actor: {evt.actor_name} ({evt.actor_role})
                      </div>
                      <div className="timeline-time">Occurred: {new Date(evt.occurred_at).toLocaleString()}</div>
                      {evt.details && <pre className="timeline-json">{JSON.stringify(evt.details, null, 2)}</pre>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions">
              <button onClick={() => setSelectedBookingForEvents(null)} className="btn-primary">
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
