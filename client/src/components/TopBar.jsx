import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export const TopBar = ({ onOpenSearch, onToggleNotifications, unreadCount }) => {
  const { user, logout } = useAuth();
  const [timeStr, setTimeStr] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour12: true, hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button onClick={onOpenSearch} className="global-search-trigger">
          <span className="search-icon">🔍</span>
          <span className="search-placeholder">Search spaces, facilities, bookings...</span>
          <kbd className="search-kbd">Ctrl + K</kbd>
        </button>
      </div>

      <div className="topbar-right">
        <div className="ist-clock-badge">
          <span className="clock-icon">🕒</span>
          <span className="clock-time">{timeStr} IST</span>
        </div>

        <button onClick={onToggleNotifications} className="notification-bell-btn" title="Notifications">
          <span className="bell-icon">🔔</span>
          {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
        </button>

        {user && (
          <div className="user-menu-wrapper" ref={userMenuRef}>
            <button onClick={() => setShowUserMenu(!showUserMenu)} className="user-avatar-btn">
              <span className="avatar-circle">{user.name.charAt(0)}</span>
              <span className="user-role-pill">{user.role}</span>
            </button>

            {showUserMenu && (
              <div className="user-dropdown-menu">
                <div className="dropdown-header">
                  <div className="dropdown-name">{user.name}</div>
                  <div className="dropdown-email">{user.email}</div>
                </div>
                <div className="dropdown-divider" />
                <button onClick={logout} className="dropdown-item text-red">
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
