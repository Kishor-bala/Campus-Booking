import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Navigation = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="app-nav">
      <div className="nav-container">
        <Link to="/" className="brand">
          <span className="brand-icon">🏛️</span>
          <span className="brand-title">Campus Booking</span>
        </Link>
        <div className="nav-links">
          {user ? (
            <>
              <Link to="/resources">Resources</Link>
              <Link to="/my-bookings">My Bookings</Link>
              {user.role === 'ADMIN' && (
                <Link to="/admin" className="badge-admin">Admin Dashboard</Link>
              )}
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className="user-role">({user.role})</span>
              </div>
              <button onClick={handleLogout} className="btn-logout">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register" className="btn-primary-sm">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
