import React, { createContext, useContext } from 'react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

// Create a global event manager for notifications
export const notificationEventManager = new EventTarget();

export const addNotification = (notification: { type: NotificationType; message: string; }) => {
    notificationEventManager.dispatchEvent(new CustomEvent('addnotification', { detail: notification }));
};

interface NotificationContextType {
  addNotification: (notification: { type: NotificationType; message:string }) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // The context value provides the dispatch function
  const contextValue = {
    addNotification
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
