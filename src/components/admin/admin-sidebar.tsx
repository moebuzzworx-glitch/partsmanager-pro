import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
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
  LogOut,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/config";
import { useAdminAccessRights } from "@/hooks/use-admin-access-rights";
import { Separator } from "@/components/ui/separator";

interface AdminSidebarProps {
  locale: Locale;
}

export function AdminSidebar({ locale }: AdminSidebarProps) {
  const pathname = usePathname();
  const { canView } = useAdminAccessRights();

  const menuGroups = [
    {
      label: "Overview",
      items: [
        {
          icon: LayoutDashboard,
          label: "Dashboard",
          href: `/${locale}/admin`,
          requiresPermission: 'dashboard' as const,
        },
        {
          icon: BarChart3,
          label: "Analytics",
          href: `/${locale}/admin/analytics`,
          requiresPermission: 'analytics' as const,
        },
        {
          icon: FileText,
          label: "Reports",
          href: `/${locale}/admin/reports`,
          requiresPermission: 'reports' as const,
        },
      ]
    },
    {
      label: "Management",
      items: [
        {
          icon: Users,
          label: "Users",
          href: `/${locale}/admin/users`,
          badge: "3", // This should be dynamic ideally
          requiresPermission: 'users' as const,
        },
        {
          icon: Bell,
          label: "Notifications",
          href: `/${locale}/admin/notifications`,
          requiresPermission: 'systemSettings' as const,
        },
      ]
    },
    {
      label: "System",
      items: [
        {
          icon: Activity,
          label: "Audit Logs",
          href: `/${locale}/admin/audit-logs`,
          requiresPermission: 'auditLogs' as const,
        },
        {
          icon: Settings,
          label: "Settings",
          href: `/${locale}/admin/system-settings`,
          requiresPermission: 'systemSettings' as const,
        },
        {
          icon: HardDrive,
          label: "Data & Backup",
          href: `/${locale}/admin/backup`,
          requiresPermission: 'dataManagement' as const,
        },
      ]
    },
    {
      label: "Security",
      items: [
        {
          icon: Lock,
          label: "Security",
          href: `/${locale}/admin/security`,
          requiresPermission: 'security' as const,
        },
        {
          icon: Key,
          label: "Access Rights",
          href: `/${locale}/admin/access-rights`,
          requiresPermission: 'accessRights' as const,
        },
      ]
    }
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <Sidebar className="border-r border-border/50 bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar/60">
      <SidebarHeader className="h-16 flex items-center justify-center border-b px-4">
        {/* Logo or Title could go here, but Header covers it. We can keep it clean or add a brand mark. */}
        <div className="font-bold text-lg tracking-tight flex items-center gap-2 w-full text-foreground/80">
          <Lock className="h-5 w-5 text-destructive" />
          <span>Admin Panel</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {menuGroups.map((group, index) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items
                  .filter(item => !item.requiresPermission || canView(item.requiresPermission))
                  .map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.label}
                          className={active ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary" : ""}
                        >
                          <Link href={item.href}>
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                            {item.badge && (
                              <span className="ms-auto inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold h-4 w-4 min-w-4 px-1">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
              </SidebarMenu>
            </SidebarGroupContent>
            {index < menuGroups.length - 1 && <Separator className="my-2 opacity-50" />}
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" className="bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors">
              <Link href={`/${locale}/dashboard`}>
                <ArrowLeft className="h-4 w-4" />
                <span className="font-medium">Back to Shop</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
