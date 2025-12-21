'use client';

import { useEffect, useState, useCallback } from 'react';
import { useFirebase } from '@/firebase/provider';
import {
  fetchUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
  Notification,
} from '@/lib/notifications';

export function useNotifications() {
  const { firestore, user } = useFirebase();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch notifications
  const loadNotifications = useCallback(async () => {
    if (!firestore || !user) {
      setIsLoading(false);
      return;
    }

    try {
      const [notifs, count] = await Promise.all([
        fetchUserNotifications(firestore, user.uid, false),
        getUnreadCount(firestore, user.uid),
      ]);

      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [firestore, user]);

  // Load on mount and set up polling
  useEffect(() => {
    loadNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);

    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Mark as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!firestore) return;

    const success = await markNotificationAsRead(firestore, notificationId);
    if (success) {
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, [firestore]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!firestore || !user) return;

    const success = await markAllNotificationsAsRead(firestore, user.uid);
    if (success) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  }, [firestore, user]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh: loadNotifications,
  };
}
