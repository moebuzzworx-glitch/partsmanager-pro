'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  FileText,
  Activity,
  Settings,
  HardDrive,
  Lock,
  Key,
  Bell,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/config";
import { useAdminAccessRights } from "@/hooks/use-admin-access-rights";

interface AdminSidebarProps {
  locale: Locale;
}

export function AdminSidebar({ locale }: AdminSidebarProps) {
  const pathname = usePathname();
  const { canView } = useAdminAccessRights();

  const adminMenuItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: `/${locale}/admin`,
      badge: null,
      requiresPermission: 'dashboard' as const,
    },
    {
      icon: Users,
      label: "Users",
      href: `/${locale}/admin/users`,
      badge: "3",
      requiresPermission: 'users' as const,
    },
    {
      icon: BarChart3,
      label: "Analytics",
      href: `/${locale}/admin/analytics`,
      badge: null,
      requiresPermission: 'analytics' as const,
    },
    {
      icon: FileText,
      label: "Reports",
      href: `/${locale}/admin/reports`,
      badge: null,
      requiresPermission: 'reports' as const,
    },
    {
      icon: Activity,
      label: "Audit Logs",
      href: `/${locale}/admin/audit-logs`,
      badge: null,
      requiresPermission: 'auditLogs' as const,
    },
    {
      icon: Settings,
      label: "System Settings",
      href: `/${locale}/admin/system-settings`,
      badge: null,
      requiresPermission: 'systemSettings' as const,
    },
    {
      icon: HardDrive,
      label: "Data Management",
      href: `/${locale}/admin/backup`,
      badge: null,
      requiresPermission: 'dataManagement' as const,
    },
    {
      icon: Lock,
      label: "Security",
      href: `/${locale}/admin/security`,
      badge: null,
      requiresPermission: 'security' as const,
    },
    {
      icon: Key,
      label: "Access Rights",
      href: `/${locale}/admin/access-rights`,
      badge: null,
      requiresPermission: 'accessRights' as const,
    },
    {
      icon: Bell,
      label: "Notifications",
      href: `/${locale}/admin/notifications`,
      badge: null,
      requiresPermission: 'systemSettings' as const, // Assuming systemSettings permission is sufficient, or create a new one if needed. Let's reuse 'systemSettings' for now or 'users'
    },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <Sidebar>
      <SidebarHeader />
      <SidebarContent className="pt-16">
        <SidebarMenu>
          {adminMenuItems
            .filter(item => !item.requiresPermission || canView(item.requiresPermission))
            .map((item) => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)}>
                    <Link href={item.href}>
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="ms-auto inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold h-5 w-5">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
