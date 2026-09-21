import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { GlobalSearch } from './GlobalSearch';
import { NotificationCenter } from './NotificationCenter';

export const AppShell = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2);

  const handleToggleNotifications = () => {
    if (!notificationsOpen) {
      setUnreadCount(0);
    }
    setNotificationsOpen(!notificationsOpen);
  };

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="shell-main">
        <TopBar
          onOpenSearch={() => setSearchOpen(true)}
          onToggleNotifications={handleToggleNotifications}
          unreadCount={unreadCount}
        />

        <main className="shell-content">
          {children}
        </main>
      </div>

      <GlobalSearch
        isOpen={searchOpen}
        onOpen={() => setSearchOpen(true)}
        onClose={() => setSearchOpen(false)}
      />

      <NotificationCenter
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </div>
  );
};
