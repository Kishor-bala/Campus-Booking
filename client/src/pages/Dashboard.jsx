import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';
import { StatusMessage } from '../components/StatusMessage';

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [resourcesCount, setResourcesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [bookingsRes, resourcesRes] = await Promise.all([
          apiFetch('/api/bookings/mine'),
          apiFetch('/api/resources?limit=1'),
        ]);
        setBookings(bookingsRes.data);
        setResourcesCount(resourcesRes.pagination.totalItems);
      } catch (err) {
        setError('Failed to load dashboard statistics.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const upcomingBookings = bookings.filter((b) => b.status === 'CONFIRMED' && b.calculatedState === 'upcoming');
  const activeBookings = bookings.filter((b) => b.status === 'CONFIRMED' && b.calculatedState === 'in_progress');
  const nextBooking = upcomingBookings[0] || null;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="dashboard-container">
      {/* Welcome Section */}
      <div className="welcome-banner">
        <div className="welcome-text">
          <h2>{getGreeting()}, {user?.name ? user.name.split(' ')[0] : 'User'} 👋</h2>
          <p>Here's what's happening with your campus reservations today.</p>
        </div>
        <div className="welcome-actions">
          <button onClick={() => navigate('/resources')} className="btn-primary-cta">
            <span>+ New Booking</span>
          </button>
        </div>
      </div>

      <StatusMessage type="error" message={error} onDismiss={() => setError(null)} />

      {/* Summary Cards */}
      <div className="stats-cards-grid">
        <div className="stat-card border-blue">
          <div className="stat-header">
            <span className="stat-icon">📅</span>
            <span className="stat-tag">UPCOMING</span>
          </div>
          <div className="stat-number">{upcomingBookings.length}</div>
          <div className="stat-desc">
            {nextBooking ? `Next: ${nextBooking.resource.name}` : 'No upcoming bookings'}
          </div>
          <Link to="/my-bookings" className="stat-link">View bookings &rarr;</Link>
        </div>

        <div className="stat-card border-amber">
          <div className="stat-header">
            <span className="stat-icon">⚡</span>
            <span className="stat-tag">IN PROGRESS</span>
          </div>
          <div className="stat-number">{activeBookings.length}</div>
          <div className="stat-desc">
            {activeBookings.length > 0 ? `Active: ${activeBookings[0].resource.name}` : 'No active slot right now'}
          </div>
          <Link to="/my-bookings" className="stat-link">View active &rarr;</Link>
        </div>

        <div className="stat-card border-emerald">
          <div className="stat-header">
            <span className="stat-icon">📍</span>
            <span className="stat-tag">AVAILABLE SPACES</span>
          </div>
          <div className="stat-number">{resourcesCount}</div>
          <div className="stat-desc">Active study rooms, labs & sports courts</div>
          <Link to="/resources" className="stat-link">Explore spaces &rarr;</Link>
        </div>

        <div className="stat-card border-purple">
          <div className="stat-header">
            <span className="stat-icon">⏱️</span>
            <span className="stat-tag">RESERVED HOURS</span>
          </div>
          <div className="stat-number">
            {bookings.filter(b => b.status === 'CONFIRMED').length} hrs
          </div>
          <div className="stat-desc">Total time reserved across all campus spaces</div>
          <Link to="/calendar" className="stat-link">View schedule &rarr;</Link>
        </div>
      </div>

      {/* Dashboard Main Grid */}
      <div className="dashboard-grid">
        {/* Next Scheduled Reservation */}
        <div className="dashboard-card">
          <div className="card-title-bar">
            <h3>Next Scheduled Reservation</h3>
            <Link to="/my-bookings" className="card-action-link">See all</Link>
          </div>

          {loading ? (
            <div className="loading-state">Loading schedule...</div>
          ) : nextBooking ? (
            <div className="next-booking-hero">
              <div className="hero-badge">{nextBooking.resource.category}</div>
              <h4 className="hero-title">{nextBooking.resource.name}</h4>
              <p className="hero-location">📍 {nextBooking.resource.location}</p>
              <div className="hero-time-strip">
                📅 {nextBooking.slot.bookingDate} &bull; 🕒 {nextBooking.slot.startsAt.split('T')[1].substring(0, 5)} - {nextBooking.slot.endsAt.split('T')[1].substring(0, 5)} IST
              </div>
              <p className="hero-purpose">📝 Purpose: {nextBooking.purpose}</p>
            </div>
          ) : (
            <div className="dashboard-empty">
              <p>You don't have any upcoming reservations.</p>
              <button onClick={() => navigate('/resources')} className="btn-secondary-sm">
                Reserve a Space Now
              </button>
            </div>
          )}
        </div>

        {/* Quick Space Discovery Shortcuts */}
        <div className="dashboard-card">
          <div className="card-title-bar">
            <h3>Quick Category Discovery</h3>
          </div>
          <div className="quick-category-grid">
            <Link to="/resources?category=Study+Room" className="category-tile">
              <span className="tile-icon">📚</span>
              <span className="tile-title">Study Rooms</span>
              <span className="tile-sub">Quiet & Group</span>
            </Link>
            <Link to="/resources?category=Equipment" className="category-tile">
              <span className="tile-icon">📽️</span>
              <span className="tile-title">Equipment</span>
              <span className="tile-sub">Projectors & AV</span>
            </Link>
            <Link to="/resources?category=Laboratory" className="category-tile">
              <span className="tile-icon">💻</span>
              <span className="tile-title">Laboratories</span>
              <span className="tile-sub">GPU & AI Workstations</span>
            </Link>
            <Link to="/resources?category=Sports" className="category-tile">
              <span className="tile-icon">🏸</span>
              <span className="tile-title">Sports Courts</span>
              <span className="tile-sub">Badminton & Indoor</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
