'use client';

import React, { useEffect } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseProvider, initializeFirebase } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { startSyncWorker, stopSyncWorker, setFirebaseContext as setSyncContext } from '@/lib/sync-worker';
import { startPullService, stopPullService, onUserActivity, setFirebaseContextPull } from '@/lib/pull-service';
import { calculateTrialDaysRemaining, isTrialExpired } from '@/lib/trial-utils';
import { createTrialCountdownNotification } from '@/lib/subscription-notifications';
import { initNotificationSound } from '@/lib/notification-sound';

import dynamic from 'next/dynamic';
import { OfflineReady } from '@/components/OfflineReady';

// Dynamically import the bot widget to ensure it only renders on client
const GlobalBotWidget = dynamic(() => import('@/components/chat-bot/bot-widget'), {
  ssr: false,
});

const { firebaseApp, firestore, auth } = initializeFirebase();

export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Domain verification - prevent running on cloned/scraped versions
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;

      // Allow all netlify.app and vercel.app subdomains, localhost, and specific custom domains
      const isAllowedDomain =
        hostname.includes('netlify.app') ||
        hostname.includes('vercel.app') ||
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === 'partsmanager-pro.com'; // Add custom domain if you have one

      if (!isAllowedDomain && process.env.NODE_ENV === 'production') {
        // Redirect to official site if running on unauthorized domain
        console.warn(`Unauthorized domain detected: ${hostname}. Redirecting to official site.`);
        window.location.href = 'https://partsmanager-pro.netlify.app';
        return;
      }
    }

    // Note: Right-click and DevTools blocking removed - this only provides false security
    // Real security comes from server-side validation, authentication, and API protection

    // Initialize notification sound system
    initNotificationSound();

    return () => { };
  }, []);

  // Start background sync (push) and pull services when user is authenticated
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser && firestore) {
        console.log('User authenticated, starting Git-like sync services...');

        // Set Firebase context for both sync and pull services
        setSyncContext(firestore, authUser.uid);
        setFirebaseContextPull(firestore, authUser.uid);

        // TRIAL NOTIFICATION: Check trial status and send countdown notification
        try {
          const userRef = doc(firestore, 'users', authUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();

            // Send trial countdown notification if user is in trial
            if (userData.subscription === 'trial') {
              const daysRemaining = calculateTrialDaysRemaining(userData as any);

              if (daysRemaining !== null) {
                console.log(`[Trial] ${daysRemaining} days remaining in trial`);

                // Send notification on login (always)
                await createTrialCountdownNotification(firestore, authUser.uid, daysRemaining);

                // Daily reminder: Check if last reminder was >24h ago
                const lastReminderKey = `trial_reminder_${authUser.uid}`;
                const lastReminderTime = localStorage.getItem(lastReminderKey);
                const now = Date.now();
                const oneDayMs = 24 * 60 * 60 * 1000;

                if (!lastReminderTime || (now - parseInt(lastReminderTime)) > oneDayMs) {
                  console.log('[Trial] Sending daily reminder notification');
                  // Notification already sent above on login, but tracking for daily reminder logic
                  localStorage.setItem(lastReminderKey, String(now));
                }
              }
            }
          }
        } catch (err) {
          console.warn('[Trial] Could not fetch user for trial notification:', err);
        }

        // Start FIFO push worker (every 30 seconds, checks queue and syncs to Firebase)
        const cleanupSync = startSyncWorker(30000);

        // Start adaptive pull service (every 10-30 minutes, fetches Firebase changes)
        const cleanupPull = startPullService();

        // Note: Activity listeners removed - poll interval only resets on data modifications (add, edit, delete)
        // View-only activities (click, keypress, scroll) no longer trigger interval reset

        return () => {
          // Cleanup: stop all services
          stopSyncWorker();
          stopPullService();
          cleanupSync();
          cleanupPull();
        };
      }
    });

    return () => {
      unsubscribe();
    };
  }, [firestore]);

  return (
    <FirebaseProvider
      firebaseApp={firebaseApp as any}
      firestore={firestore as any}
      auth={auth as any}
    >
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
        <GlobalBotWidget />
        <OfflineReady />
      </ThemeProvider>
    </FirebaseProvider>
  );
}
