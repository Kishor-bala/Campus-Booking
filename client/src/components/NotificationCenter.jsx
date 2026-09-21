import React from 'react';

export const NotificationCenter = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const notifications = [
    {
      id: 1,
      title: '2FA Email Verification Enabled',
      message: 'Your account is now protected with 2-Factor Email OTP authentication.',
      time: 'Just now',
      type: 'info',
    },
    {
      id: 2,
      title: 'Campus Booking Timezone',
      message: 'All slot schedules are displayed in Asia/Kolkata (IST).',
      time: 'Today',
      type: 'success',
    },
  ];

  return (
    <div className="notification-drawer-overlay" onClick={onClose}>
      <div className="notification-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h3>Campus Notifications</h3>
          <button onClick={onClose} className="btn-close-drawer">✕</button>
        </div>

        <div className="drawer-body">
          {notifications.map((n) => (
            <div key={n.id} className="notification-item">
              <div className="item-icon-wrapper">
                {n.type === 'success' ? '✅' : 'ℹ️'}
              </div>
              <div className="item-content">
                <div className="item-title">{n.title}</div>
                <div className="item-desc">{n.message}</div>
                <div className="item-time">{n.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
