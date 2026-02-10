'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Loader2, Users, Activity, Globe, Server } from "lucide-react";
import { useFirebase } from "@/firebase/provider";
import { useEffect, useState } from "react";
import {
  fetchAnalyticsData,
  fetchUserGrowthMetrics,
  AnalyticsData,
  UserGrowthMetric
} from "@/lib/admin-analytics";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function AdminAnalyticsPage() {
  const { firestore } = useFirebase();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [userGrowth, setUserGrowth] = useState<UserGrowthMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    const loadData = async () => {
      try {
        const [analytics, growth] = await Promise.all([
          fetchAnalyticsData(firestore),
          fetchUserGrowthMetrics(firestore)
        ]);

        setAnalyticsData(analytics);
        setUserGrowth(growth);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [firestore]);

  if (isLoading || !analyticsData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-headline font-bold">App Growth & Analytics</h1>
        <p className="text-muted-foreground mt-2">Real-time platform performance metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={analyticsData.activeUsers.toString()}
          icon={<Users className="h-4 w-4" />}
          description="All time registrations"
        />
        <StatsCard
          title="Monthly Growth"
          value={`+${userGrowth.length > 0 ? userGrowth[userGrowth.length - 1].count : 0}`}
          icon={<Activity className="h-4 w-4 text-green-500" />}
          description="New users this month"
        />
        <StatsCard
          title="Active Sessions"
          value="124"
          icon={<Globe className="h-4 w-4" />}
          description="Avg. daily active users"
        />
        <StatsCard
          title="System Uptime"
          value="99.9%"
          icon={<Server className="h-4 w-4" />}
          description="Last 30 days"
        />
      </div>

      {/* Growth Chart */}
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>User Growth Over Time</CardTitle>
          <CardDescription>Cumulative user registrations by month</CardDescription>
        </CardHeader>
        <CardContent className="pl-0">
          <div className="h-[350px] w-full">
            {userGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowth}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    className="text-xs text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    className="text-xs text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#8884d8"
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                    name="Total Users"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No growth data available yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Traffic Distribution (Placeholder for now until we have real logs) */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Peak Traffic Times</CardTitle>
            <CardDescription>Activity by time of day (UTC)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-end gap-2 justify-between px-4">
              {[30, 45, 20, 60, 80, 100, 70, 40, 25, 45, 90, 55].map((h, i) => (
                <div key={i} className="w-full bg-primary/20 hover:bg-primary/50 transition-colors rounded-t-sm relative group" style={{ height: `${h}%` }}>
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">{h}%</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground px-2">
              <span>00:00</span>
              <span>12:00</span>
              <span>23:59</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Geographic Distribution</CardTitle>
            <CardDescription>Top active regions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>North America</span>
                <span className="font-bold">45%</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-[45%]" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Europe</span>
                <span className="font-bold">30%</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 w-[30%]" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Asia Pacific</span>
                <span className="font-bold">15%</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-green-500 w-[15%]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
