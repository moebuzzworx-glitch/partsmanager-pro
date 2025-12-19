'use client';

import React, { useEffect } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseProvider, initializeFirebase } from '@/firebase';

const { firebaseApp, firestore, auth } = initializeFirebase();

export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Domain verification - prevent running on cloned/scraped versions
    if (typeof window !== 'undefined') {
      const allowedDomains = [
        'partsmanager-pro.netlify.app',
        'partsmanager-pro.vercel.app',
        'localhost',
        '127.0.0.1',
      ];
      
      const hostname = window.location.hostname;
      const isAllowed = allowedDomains.some(domain => hostname.includes(domain));
      
      if (!isAllowed && process.env.NODE_ENV === 'production') {
        // Redirect to official site if running elsewhere
        window.location.href = 'https://partsmanager-pro.netlify.app';
        return;
      }
    }

    // Disable right-click context menu
    const disableContextMenu = (e: MouseEvent) => {
      if (process.env.NODE_ENV === 'production') {
        e.preventDefault();
      }
    };

    // Disable keyboard shortcuts for developer tools
    const disableDevTools = (e: KeyboardEvent) => {
      if (process.env.NODE_ENV === 'production') {
        // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
        if (
          e.key === 'F12' ||
          (e.ctrlKey && e.shiftKey && e.key === 'I') ||
          (e.ctrlKey && e.shiftKey && e.key === 'J') ||
          (e.ctrlKey && e.shiftKey && e.key === 'C')
        ) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('contextmenu', disableContextMenu);
    document.addEventListener('keydown', disableDevTools);

    return () => {
      document.removeEventListener('contextmenu', disableContextMenu);
      document.removeEventListener('keydown', disableDevTools);
    };
  }, []);

  return (
    <FirebaseProvider firebaseApp={firebaseApp} firestore={firestore} auth={auth}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    </FirebaseProvider>
  );
}
