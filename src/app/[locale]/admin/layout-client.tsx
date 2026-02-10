'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Locale } from "@/lib/config";
import { getDictionary } from "@/lib/dictionaries";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useFirebase } from "@/firebase/provider";
import { doc, getDoc } from 'firebase/firestore';
import { User as AppUser } from "@/lib/types";
import { AdminHeader } from '@/components/admin/admin-header';

export function AdminLayoutClient({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  const router = useRouter();
  const routerRef = useRef(router);
  const pathname = usePathname();
  const { user, firestore, isUserLoading } = useFirebase();
  const [userDoc, setUserDoc] = useState<AppUser | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [dictionary, setDictionary] = useState<any>(null);

  // Keep router ref updated
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  // Set dir attribute based on locale
  useEffect(() => {
    const dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [locale]);

  // Skip auth checks for login page
  const isLoginPage = pathname?.includes('/admin/login');

  // Load dictionary
  useEffect(() => {
    getDictionary(locale).then(setDictionary);
  }, [locale]);

  // Check if user is admin - all auth logic in ONE effect
  useEffect(() => {
    // Skip auth checks for login page
    if (isLoginPage) {
      console.log('🔑 Login page detected, skipping auth checks');
      setIsChecking(false);
      return;
    }

    // If loading, wait for Firebase auth
    if (isUserLoading) {
      console.log('⏳ isUserLoading is true, returning early');
      return;
    }

    if (!user) {
      // Not authenticated, redirect to login
      console.log('❌ No user found, redirecting to login');
      setIsChecking(false);
      routerRef.current.push(`/${locale}/admin/login`);
      return;
    }

    if (!firestore) {
      console.log('❌ Firestore not available');
      setIsChecking(false);
      return;
    }

    // Fetch user document from Firestore
    let isMounted = true;
    (async () => {
      try {
        console.log('🔍 Fetching user doc for UID:', user.uid);
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!isMounted) return;

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as AppUser;
          console.log('✅ User document found:', userData);

          // Check if user is admin
          if (userData.role !== 'admin') {
            // Not admin, redirect to dashboard
            console.log('❌ User role is not admin:', userData.role);
            setIsChecking(false);
            routerRef.current.push(`/${locale}/dashboard`);
          } else {
            console.log('✅ User is admin, allowing access');
            setUserDoc(userData);
            setIsChecking(false);
          }
        } else {
          // User document doesn't exist, redirect to admin login
          console.log('❌ User document does not exist in Firestore');
          setIsChecking(false);
          routerRef.current.push(`/${locale}/admin/login`);
        }
      } catch (error) {
        console.error('❌ Error fetching user document:', error);
        if (isMounted) {
          setIsChecking(false);
          routerRef.current.push(`/${locale}/admin/login`);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user, firestore, isUserLoading, locale, isLoginPage]);

  if (isUserLoading || (isChecking && !isLoginPage) || !dictionary) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If on login page, show the login page content without admin layout
  if (isLoginPage) {
    return children;
  }

  // Not authenticated and not on login page
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-destructive mb-4">Not Authenticated</h1>
          <p className="text-muted-foreground mb-6">You must be logged in to access the admin area.</p>
          <Button onClick={() => routerRef.current.push(`/${locale}/admin/login`)}>
            Go to Admin Login
          </Button>
        </div>
      </div>
    );
  }

  if (!userDoc || userDoc.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-destructive mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You must be an administrator to access this area.</p>
          <p className="text-sm text-muted-foreground mb-6">Current role: <span className="font-semibold">{userDoc?.role || 'Unknown'}</span></p>
          <Button onClick={() => router.push(`/${locale}/dashboard`)}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background dark:bg-zinc-950">
      <SidebarProvider>
        <AdminSidebar locale={locale} />
        <SidebarInset>
          <AdminHeader
            user={userDoc}
            locale={locale}
            dictionary={dictionary}
          />
          <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-6 bg-muted/10 dark:bg-zinc-900/50">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
