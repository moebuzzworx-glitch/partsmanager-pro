'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  // Only initialize on client side - prevent server-side initialization during build
  if (typeof window === 'undefined') {
    console.warn('[Firebase] Skipping initialization on server');
    return {
      firebaseApp: null,
      auth: null,
      firestore: null
    };
  }

  if (!getApps().length) {
    // Important! initializeApp() is called without any arguments because Firebase App Hosting
    // integrates with the initializeApp() function to provide the environment variables needed to
    // populate the FirebaseOptions in production. It is critical that we attempt to call initializeApp()
    // without arguments.
    let firebaseApp;
    try {
      // Attempt to initialize via Firebase App Hosting environment variables
      firebaseApp = initializeApp();
    } catch (e) {
      // Only warn in production because it's normal to use the firebaseConfig to initialize
      // during development
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      // Check if config is complete before initializing
      console.log('[Firebase] Config check:', {
        hasApiKey: !!firebaseConfig.apiKey,
        hasProjectId: !!firebaseConfig.projectId,
        apiKey: firebaseConfig.apiKey ? firebaseConfig.apiKey.substring(0, 10) + '...' : 'MISSING',
        projectId: firebaseConfig.projectId || 'MISSING'
      });
      if (firebaseConfig.apiKey && firebaseConfig.projectId) {
        try {
          console.log('[Firebase] Initializing with config object...');
          firebaseApp = initializeApp(firebaseConfig);

          try {
            initializeFirestore(firebaseApp, {
              localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
              })
            });
            console.log('[Firebase] ✅ Offline persistence enabled');
          } catch (err: any) {
            // Ignore if already initialized
            console.warn('[Firebase] Persistence init warning:', err.message);
          }

          console.log('[Firebase] ✅ Successfully initialized with config');
        } catch (configError) {
          console.error('[Firebase] ❌ Failed to initialize with config:', configError);
          throw configError;
        }
      } else {
        console.warn('[Firebase] Missing required config - skipping initialization');
        return {
          firebaseApp: null,
          auth: null,
          firestore: null
        };
      }
    }

    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
