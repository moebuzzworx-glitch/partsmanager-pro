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
} from 'lucide-react';
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

  // Set dir attribute based on locale
  useEffect(() => {
    const dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [locale]);

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
    { href: `/dashboard/trash`, icon: <Trash2 />, label: dictionary?.dashboard?.trash || 'Trash' },
  ];

  if (!dictionary) {
    return (
      <div className="flex items-center justify-center h-[100dvh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider className="flex flex-col h-[100dvh] bg-background w-full">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 w-full">
        <MobileTriggerLogo />
        <div className="flex-1">
          {/* Search can go here */}
        </div>
        <FullScreenToggle />
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
        {mockUser && (
          <UserNav
            user={mockUser}
            dictionary={dictionary.auth}
          />
        )}
      </header>
      <div className='flex flex-1 overflow-hidden w-full'>
        <Sidebar>
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
          <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-6">
            <DashboardLayoutClient locale={locale}>
              {children}
            </DashboardLayoutClient>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
