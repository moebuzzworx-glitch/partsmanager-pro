'use client';

import Link from 'next/link';
import { useEffect, useState, use } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from '@/components/ui/sidebar';
import {
  Home,
  Package,
  ShoppingCart,
  Users,
  FileText,
  Trash2,
  Settings,
  Building,
  Bell,
  Sun,
  Moon,
  CheckCircle,
  AlertCircle,
  Info,
  Loader2,
  Headphones,
  Printer,
  Camera,
  Pin,
} from 'lucide-react';
import { useBotStore } from '@/hooks/use-bot-store';
import { getDictionary } from '@/lib/dictionaries';
import { Locale } from '@/lib/config';
import { Logo } from '@/components/logo';
import { mockUser } from '@/lib/data';
import { UserNav } from '@/components/dashboard/user-nav';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useNotifications } from '@/hooks/use-notifications';
import { DashboardLayoutClient } from './layout-client';
import { FullScreenToggle } from '@/components/fullscreen-toggle';

import { MobileTriggerLogo } from '@/components/dashboard/mobile-trigger-logo';
import { SidebarNavLink } from '@/components/dashboard/sidebar-nav-link';

import { ScanSessionProvider } from '@/lib/scan-session-provider';

export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = use(params);
  const [dictionary, setDictionary] = useState<any>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { openBot } = useBotStore();
  const [isMobile, setIsMobile] = useState(false);
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  // Set dir attribute based on locale
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;

    // Check mobile
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [locale, dir]);

  useEffect(() => {
    getDictionary(locale).then(setDictionary);
  }, [locale]);

  const navItems = [
    { href: `/dashboard`, icon: <Home />, label: dictionary?.dashboard?.title || 'Dashboard' },
    { href: `/dashboard/stock`, icon: <Package />, label: dictionary?.dashboard?.stock || 'Stock' },
    { href: `/dashboard/sales`, icon: <ShoppingCart />, label: dictionary?.dashboard?.sales || 'Sales' },
    { href: `/dashboard/purchases`, icon: <Building />, label: dictionary?.dashboard?.purchases || 'Purchases' },
    { href: `/dashboard/customers`, icon: <Users />, label: dictionary?.dashboard?.customers || 'Customers' },
    { href: `/dashboard/suppliers`, icon: <Users />, label: dictionary?.dashboard?.suppliers || 'Suppliers' },
    { href: `/dashboard/invoices`, icon: <FileText />, label: dictionary?.dashboard?.invoices || 'Invoices' },
    { href: `/dashboard/labels`, icon: <Printer />, label: dictionary?.dashboard?.labels || 'Labels' },
    { href: `/dashboard/trash`, icon: <Trash2 />, label: dictionary?.dashboard?.trash || 'Trash' },
  ];

  // Only add Scanner link if on Mobile
  if (isMobile) {
    navItems.splice(8, 0, { href: `/scan`, icon: <Camera />, label: dictionary?.dashboard?.scanner || 'Scanner' });
  }

  if (!dictionary) {
    return (
      <div className="flex items-center justify-center h-[100dvh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <ScanSessionProvider>
      <SidebarProvider className="flex flex-col h-[100dvh] bg-background w-full">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 print:hidden">
          <MobileTriggerLogo />
          <div className="flex-1">
            {/* Search can go here */}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] sm:text-xs font-extrabold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">24/7</span>
            <Button variant="ghost" size="icon" onClick={openBot} title="Support">
              <Headphones className="h-[1.2rem] w-[1.2rem]" />
              <span className="sr-only">Support</span>
            </Button>
          </div>
          <FullScreenToggle />
          <LanguageSwitcher />
          <DropdownMenu dir={dir}>
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
          <DropdownMenu dir={dir}>
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
                      markAllAsRead();
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

                    const isPinned = notification.pinned && (!notification.pinExpiresAt || (notification.pinExpiresAt.toDate?.() || new Date(notification.pinExpiresAt as any)).getTime() > Date.now());

                    return (
                      <DropdownMenuItem
                        key={notification.id}
                        className={`flex flex-col items-start gap-2 p-3 rounded-md cursor-pointer ${isPinned ? 'bg-amber-50/50 hover:bg-amber-100/50 border-l-2 border-amber-400' : 'bg-secondary/50 hover:bg-secondary'
                          }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex gap-2 w-full">
                          {getIcon()}
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              {isPinned && <Pin className="h-3 w-3 text-amber-500 fill-amber-500 rotate-45 shrink-0" />}
                              <p className="font-medium text-sm">
                                {notification.translations?.[locale as string]?.title || notification.title}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {notification.translations?.[locale as string]?.message || notification.message}
                            </p>
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
          {mockUser && (
            <UserNav
              user={mockUser}
              dictionary={dictionary.auth}
              locale={locale}
            />
          )}
        </header>
        <div className='flex flex-1 overflow-hidden w-full'>
          <Sidebar className="print:hidden">
            <SidebarHeader>
            </SidebarHeader>
            <SidebarContent className="pt-16">
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarNavLink href={`/${locale}${item.href}`} icon={item.icon}>
                      {item.label}
                    </SidebarNavLink>
                  </SidebarMenuItem>
                ))}
                {mockUser.role === 'admin' && (
                  <SidebarMenuItem>
                    <SidebarNavLink href={`/${locale}/dashboard/settings`} icon={<Settings />}>
                      {dictionary.dashboard.settings}
                    </SidebarNavLink>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <main className="flex-1 overflow-y-auto px-0 py-2 md:p-8 md:pt-6">
              <DashboardLayoutClient locale={locale}>
                {children}
              </DashboardLayoutClient>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ScanSessionProvider>
  );
}

