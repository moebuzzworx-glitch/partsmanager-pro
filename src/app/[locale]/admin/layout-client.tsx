'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Locale } from "@/lib/config";
import { getDictionary } from "@/lib/dictionaries";
import { Logo } from "@/components/logo";
import { UserNav } from "@/components/dashboard/user-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Bell, Loader2 } from "lucide-react";
import { useFirebase } from "@/firebase/provider";
import { doc, getDoc } from 'firebase/firestore';
import { User as AppUser } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  // Keep router ref updated
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  // Skip auth checks for login page
  const isLoginPage = pathname?.includes('/admin/login');

  // Load dictionary
  useEffect(() => {
    getDictionary(locale).then(setDictionary);
  }, [locale]);

  // Handle redirects when redirectUrl is set
  useEffect(() => {
    if (redirectUrl) {
      routerRef.current.push(redirectUrl);
    }
  }, [redirectUrl]);

  // Skip all auth checks for login page and just show children
  if (isLoginPage) {
    return children;
  }

  // Check if user is admin
  useEffect(() => {
    // If loading, wait for Firebase auth
    if (isUserLoading) {
      console.log('⏳ isUserLoading is true, returning early');
      return;
    }

    if (!user) {
      // Not authenticated, set redirect
      console.log('❌ No user found, redirecting to login');
      setRedirectUrl(`/${locale}/admin/login`);
      setIsChecking(false);
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
            setUserDoc(null);
            setRedirectUrl(`/${locale}/dashboard`);
          } else {
            console.log('✅ User is admin, allowing access');
            setUserDoc(userData);
          }
        } else {
          // User document doesn't exist, redirect to admin login
          console.log('❌ User document does not exist in Firestore');
          setUserDoc(null);
          setRedirectUrl(`/${locale}/admin/login`);
        }
      } catch (error) {
        console.error('❌ Error fetching user document:', error);
        if (isMounted) {
          setUserDoc(null);
          setRedirectUrl(`/${locale}/admin/login`);
        }
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user, firestore, isUserLoading, locale]);

  if (isUserLoading || isChecking || !dictionary) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Not authenticated
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
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <Logo />
        <div className="flex-1">
            {/* Search can go here */}
        </div>
        <LanguageSwitcher />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <span className="sr-only">Toggle theme</span>
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <ThemeSwitcher />
          </DropdownMenuContent>
        </DropdownMenu>
         <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                5
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <div className="flex flex-col">
                <span className="font-medium">System Update Available</span>
                <span className="text-xs text-muted-foreground">
                  A new system update is available. Please review.
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {userDoc && dictionary && (
          <UserNav 
            user={{ 
              ...userDoc, 
              name: userDoc.email, 
              avatarUrl: '',
              createdAt: userDoc.createdAt as any
            }} 
            dictionary={dictionary.auth} 
          />
        )}
      </header>
      <div className='flex flex-1 overflow-hidden'>
        <SidebarProvider>
          <AdminSidebar locale={locale} />
          <SidebarInset>
              <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-6">
                {children}
              </main>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </div>
  );
}
