'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Activity,
  FileText,
  Lock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Globe,
  Server
} from "lucide-react";
import Link from "next/link";
import { Locale } from "@/lib/config";
import { useFirebase } from "@/firebase/provider";
import { fetchAnalyticsData } from "@/lib/admin-analytics";
import { useEffect, useState } from "react";

export default function AdminDashboard({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const { firestore } = useFirebase();
  const [platformData, setPlatformData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    const loadData = async () => {
      try {
        const data = await fetchAnalyticsData(firestore);
        setPlatformData(data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        setPlatformData({
          activeUsers: 0,
          totalUsers: 0,
          systemStatus: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [firestore]);

  if (isLoading || !platformData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const statusIcon = platformData.systemStatus === 'healthy'
    ? <CheckCircle className="h-4 w-4 text-green-500" />
    : <AlertTriangle className="h-4 w-4 text-yellow-500" />;

  const statusText = platformData.systemStatus === 'healthy'
    ? 'All systems operational'
    : 'System degradation detected';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Platform Overview</h1>
          <p className="text-muted-foreground mt-2">Monitor application health and user activity</p>
        </div>
      </div>

      {/* Key Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Online Users"
          value="12"
          icon={<Globe className="h-4 w-4" />}
          description="Active in last 15 min"
        />
        <StatsCard
          title="Total Users"
          value={platformData.activeUsers.toString()}
          icon={<Users className="h-4 w-4" />}
          description="Registered accounts"
        />
        <StatsCard
          title="Server Health"
          value={platformData.systemStatus === 'healthy' ? "99.9%" : "Warnings"}
          icon={<Server className="h-4 w-4" />}
          description={statusText}
        />
        <StatsCard
          title="System Status"
          value={platformData.systemStatus.charAt(0).toUpperCase() + platformData.systemStatus.slice(1)}
          icon={statusIcon}
          description="API & Database"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Actions</CardTitle>
          <CardDescription>Moderation and system controls</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href={`/${locale}/admin/users`}>
                <Users className="mr-2 h-4 w-4" />
                Moderate Users
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href={`/${locale}/admin/system-settings`}>
                <Lock className="mr-2 h-4 w-4" />
                Maintenance Mode
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href={`/${locale}/admin/audit-logs`}>
                <Activity className="mr-2 h-4 w-4" />
                Security Logs
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href={`/${locale}/admin/security`}>
                <Lock className="mr-2 h-4 w-4" />
                Security Policy
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Admin Sections Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* User Management */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Moderation
            </CardTitle>
            <CardDescription>Manage access and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Review new registrations, ban suspicious accounts, and manage user roles.
            </p>
            <Button asChild variant="ghost" className="w-full justify-start">
              <Link href={`/${locale}/admin/users`}>
                Manage Users →
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-slate-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Platform Settings
            </CardTitle>
            <CardDescription>Global configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Configure maintenance windows, registration policies, and system-wide announcements.
            </p>
            <Button asChild variant="ghost" className="w-full justify-start">
              <Link href={`/${locale}/admin/system-settings`}>
                Settings →
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Audit Logs */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Security Audit
            </CardTitle>
            <CardDescription>Recent system activity</CardDescription>
          </CardHeader>
          <CardContent>
            {/* We can re-use the activity feed logic here later, simplified for now */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">System Online</span>
                </div>
                <span className="text-xs text-muted-foreground">Now</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium">New User Registration</span>
                </div>
                <span className="text-xs text-muted-foreground">5 mins ago</span>
              </div>
              <Button asChild variant="link" className="px-0">
                <Link href={`/${locale}/admin/audit-logs`}>View Full Log</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
