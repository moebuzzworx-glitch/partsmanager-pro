'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useFirebase } from '@/firebase/provider';
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Locale } from '@/lib/config';

export function DashboardLayoutClient({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  const router = useRouter();
  const routerRef = useRef(router);
  const pathname = usePathname();
  const { user, isUserLoading } = useFirebase();
  const [isChecking, setIsChecking] = useState(true);

  // Keep router ref updated
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  // Check if user is authenticated
  useEffect(() => {
    // Skip auth checks for login page
    const isLoginPage = pathname?.includes('/login');
    if (isLoginPage) {
      console.log('🔑 Login page detected, skipping auth checks');
      setIsChecking(false);
      return;
    }

    // If loading, wait for Firebase auth
    if (isUserLoading) {
      console.log('⏳ isUserLoading is true, waiting for auth...');
      return;
    }

    // Auth check complete
    setIsChecking(false);

    if (!user) {
      // Not authenticated, check if logging out
      const isLoggingOut = typeof window !== 'undefined' ? sessionStorage.getItem('isLoggingOut') : null;

      if (isLoggingOut) {
        console.log('👋 Logout detected, redirecting to landing page');
        sessionStorage.removeItem('isLoggingOut');
        routerRef.current.push(`/${locale}`);
      } else {
        console.log('❌ No user found, redirecting to login');
        routerRef.current.push(`/${locale}/login`);
      }
      return;
    }

    console.log('✅ User authenticated:', user.email);
  }, [user, isUserLoading, pathname, locale]);

  // Show loading state during authentication check
  if (isUserLoading || isChecking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-destructive mb-4">Not Authenticated</h1>
          <p className="text-muted-foreground mb-6">You must be logged in to access the dashboard.</p>
          <Button onClick={() => routerRef.current.push(`/${locale}/login`)}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // User is authenticated, show dashboard
  return <>{children}</>;
}
