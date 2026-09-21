import React from 'react';

export const StatusMessage = ({ type = 'info', message, onDismiss }) => {
  if (!message) return null;

  const statusClasses = {
    error: 'status-error',
    success: 'status-success',
    info: 'status-info',
    warning: 'status-warning',
  };

  return (
    <div className={`status-message ${statusClasses[type] || 'status-info'}`}>
      <div>{message}</div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold', marginLeft: '12px' }}
        >
          ✕
        </button>
      )}
    </div>
  );
};

