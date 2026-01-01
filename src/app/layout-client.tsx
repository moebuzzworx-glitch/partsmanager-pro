'use client';

import React, { useEffect } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseProvider, initializeFirebase } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { startSyncWorker, stopSyncWorker } from '@/lib/sync-worker';
import { startPullService, stopPullService, onUserActivity } from '@/lib/pull-service';

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

    return () => {};
  }, []);

  // Start background sync (push) and pull services when user is authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && firestore) {
        console.log('User authenticated, starting Git-like sync services...');
        
        // Start FIFO push worker (every 30 seconds, checks queue and syncs to Firebase)
        const cleanupSync = startSyncWorker(30000);
        
        // Start adaptive pull service (every 10-30 minutes, fetches Firebase changes)
        const cleanupPull = startPullService();
        
        // Register activity listener to reset pull interval
        const activityHandler = () => onUserActivity();
        ['click', 'keypress', 'scroll'].forEach(event => {
          document.addEventListener(event, activityHandler);
        });
        
        return () => {
          // Cleanup: stop all services
          stopSyncWorker();
          stopPullService();
          ['click', 'keypress', 'scroll'].forEach(event => {
            document.removeEventListener(event, activityHandler);
          });
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
    <FirebaseProvider firebaseApp={firebaseApp} firestore={firestore} auth={auth}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    </FirebaseProvider>
  );
}
