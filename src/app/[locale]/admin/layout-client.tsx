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
import { Sun, Moon, Bell, Loader2, CheckCircle, AlertCircle, Info, Headphones } from "lucide-react";
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
import { useNotifications } from "@/hooks/use-notifications";
import { useBotStore } from '@/hooks/use-bot-store';

function SupportButton() {
  const { openBot } = useBotStore();

  useEffect(() => {
    console.log('Admin SupportButton mounted');
  }, []);

  return (
    <Button variant="ghost" size="icon" onClick={() => {
      console.log('Admin SupportButton clicked');
      openBot();
    }}>
      <Headphones className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">Support</span>
    </Button>
  );
}

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
  const { notifications, unreadCount, markAsRead } = useNotifications();

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
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <Logo />
        <div className="flex-1">
          {/* Search can go here */}
        </div>
        <SupportButton />
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
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex justify-between items-center">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => {
                    // Mark all as read
                  }}
                >
                  Mark all as read
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length > 0 ? (
              <div className="max-h-96 overflow-y-auto space-y-2 p-2">
                {notifications.map((notification) => {
                  const getIcon = () => {
                    switch (notification.type) {
                      case 'success':
                        return <CheckCircle className="h-4 w-4 text-green-600" />;
                      case 'error':
                      case 'alert':
                      case 'low-stock-alert':
                        return <AlertCircle className="h-4 w-4 text-red-600" />;
                      case 'warning':
                        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
                      default:
                        return <Info className="h-4 w-4 text-blue-600" />;
                    }
                  };

                  return (
                    <DropdownMenuItem
                      key={notification.id}
                      className="flex flex-col items-start gap-2 p-3 rounded-md bg-secondary/50 hover:bg-secondary cursor-pointer"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex gap-2 w-full">
                        {getIcon()}
                        <div className="flex-1">
                          <p className="font-medium text-sm">{notification.title}</p>
                          <p className="text-xs text-muted-foreground">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notification.createdAt
                              ? new Date(
                                notification.createdAt.toDate?.() || notification.createdAt
                              ).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                              : 'Just now'}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="h-2 w-2 bg-blue-600 rounded-full mt-1 flex-shrink-0"></div>
                        )}
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            )}
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
