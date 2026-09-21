import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Sidebar = ({ isCollapsed, onToggle }) => {
  const { user, logout } = useAuth();

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="brand-logo">
          <span className="logo-icon">🏛️</span>
          {!isCollapsed && <span className="logo-text">Campus Hub</span>}
        </div>
        <button onClick={onToggle} className="btn-toggle-sidebar" title="Toggle Sidebar">
          {isCollapsed ? '❯' : '❮'}
        </button>
      </div>

      <nav className="sidebar-menu">
        <div className="menu-group">
          {!isCollapsed && <span className="group-label">OVERVIEW</span>}
          <NavLink to="/dashboard" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
            <span className="item-icon">📊</span>
            {!isCollapsed && <span className="item-label">Dashboard</span>}
          </NavLink>
          <NavLink to="/resources" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
            <span className="item-icon">🔍</span>
            {!isCollapsed && <span className="item-label">Explore Spaces</span>}
          </NavLink>
          <NavLink to="/calendar" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
            <span className="item-icon">📅</span>
            {!isCollapsed && <span className="item-label">Campus Calendar</span>}
          </NavLink>
        </div>

        <div className="menu-group">
          {!isCollapsed && <span className="group-label">RESERVATIONS</span>}
          <NavLink to="/my-bookings" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
            <span className="item-icon">📋</span>
            {!isCollapsed && <span className="item-label">My Bookings</span>}
          </NavLink>
        </div>

        {user && user.role === 'ADMIN' && (
          <div className="menu-group">
            {!isCollapsed && <span className="group-label">ADMINISTRATION</span>}
            <NavLink to="/admin" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
              <span className="item-icon">🛡️</span>
              {!isCollapsed && <span className="item-label">Admin Console</span>}
            </NavLink>
          </div>
        )}
      </nav>

      {user && (
        <div className="sidebar-footer">
          {!isCollapsed ? (
            <div className="user-profile-mini">
              <div className="user-avatar">{user.name.charAt(0)}</div>
              <div className="user-details">
                <div className="user-name">{user.name}</div>
                <div className="user-email">{user.email}</div>
              </div>
            </div>
          ) : (
            <div className="user-avatar" title={user.name}>{user.name.charAt(0)}</div>
          )}
        </div>
      )}
    </aside>
  );
};
