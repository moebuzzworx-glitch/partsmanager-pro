
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarGroup
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Boxes,
  ShoppingBasket,
  Receipt,
  Users,
  Building,
  Wrench,
  Factory,
  Settings,
  CircleUser,
  CreditCard,
  Download,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/stock', label: 'Stock', icon: Boxes },
  { href: '/purchases', label: 'Purchases', icon: ShoppingBasket },
  { href: '/sales', label: 'Sales', icon: Receipt },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/suppliers', label: 'Suppliers', icon: Building },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/tools', label: 'Tools', icon: Wrench },
  { href: '/export', label: 'Export', icon: Download },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <Factory className="size-8 text-primary" />
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold font-headline">Mech Parts</h2>
            <p className="text-sm text-muted-foreground">Heavy Duty</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4">
          <SidebarMenu>
            <SidebarMenuItem>
                <Link href="/settings">
                    <SidebarMenuButton tooltip="Settings" isActive={pathname === '/settings'}>
                        <Settings/>
                        <span>Settings</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton tooltip="Profile">
                    <Avatar className="size-6">
                        <AvatarImage src="https://picsum.photos/seed/avatar/40/40" />
                        <AvatarFallback>AD</AvatarFallback>
                    </Avatar>
                    <span>Admin</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
