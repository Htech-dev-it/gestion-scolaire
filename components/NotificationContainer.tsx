import React, { useState, useEffect } from 'react';
import { notificationEventManager } from '../contexts/NotificationContext';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: number;
  type: NotificationType;
  message: string;
}

const NotificationToast: React.FC<{ notification: Notification; onDismiss: () => void }> = ({ notification, onDismiss }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        // Reset exiting state when a new notification comes in, so it can animate in.
        setIsExiting(false);

        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(onDismiss, 500); // Wait for animation to finish
        }, 5000);

        // Cleanup the timer if the component unmounts or if a new notification arrives
        return () => clearTimeout(timer);
    }, [notification, onDismiss]); // Re-run effect when the notification object itself changes
    
    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(onDismiss, 500);
    };

    const baseClasses = "relative w-full max-w-sm p-4 my-2 overflow-hidden rounded-lg shadow-lg text-white";
    const typeClasses = {
        success: "bg-green-500",
        error: "bg-red-500",
        warning: "bg-yellow-500",
        info: "bg-blue-500"
    };

    const iconClasses = "h-6 w-6 mr-3";
    const icons = {
        success: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        error: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        warning: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
        info: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    };

    return (
        <div className={`${baseClasses} ${typeClasses[notification.type]} ${isExiting ? 'toast-out' : 'toast-in'}`} role="alert">
            <div className="flex items-center">
                {icons[notification.type]}
                <p className="flex-1 text-sm font-medium">{notification.message}</p>
                 <button onClick={handleDismiss} className="ml-4 p-1 rounded-full hover:bg-white/20 transition-colors focus:outline-none">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
            </div>
        </div>
    );
};

const NotificationContainer: React.FC = () => {
    const [notification, setNotification] = useState<Notification | null>(null);

    useEffect(() => {
        const handleNewNotification = (event: Event) => {
            const customEvent = event as CustomEvent;
            // Set the new notification, which will replace the old one
            setNotification({ ...customEvent.detail, id: Date.now() });
        };
        notificationEventManager.addEventListener('addnotification', handleNewNotification);
        return () => {
            notificationEventManager.removeEventListener('addnotification', handleNewNotification);
        };
    }, []);

    const dismissNotification = () => {
        setNotification(null);
    };

    return (
        <div className="fixed top-4 right-4 z-[100] w-full max-w-sm">
            {notification && (
                <NotificationToast
                    key={notification.id} // Key helps React to re-mount the component if id changes
                    notification={notification}
                    onDismiss={dismissNotification}
                />
            )}
        </div>
    );
};

export default NotificationContainer;