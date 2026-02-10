'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Loader2, Users, Activity, Globe, Server, CreditCard } from "lucide-react";
import { useFirebase } from "@/firebase/provider";
import { useEffect, useState } from "react";
import {
  fetchAnalyticsData,
  fetchUserGrowthMetrics,
  fetchSubscriptionStats,
  fetchActivityByHour,
  AnalyticsData,
  UserGrowthMetric,
  SubscriptionStats,
  ActivityByHour
} from "@/lib/admin-analytics";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';

export default function AdminAnalyticsPage() {
  const { firestore } = useFirebase();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [userGrowth, setUserGrowth] = useState<UserGrowthMetric[]>([]);
  const [subStats, setSubStats] = useState<SubscriptionStats | null>(null);
  const [trafficData, setTrafficData] = useState<ActivityByHour[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    const loadData = async () => {
      try {
        const [analytics, growth, subs, traffic] = await Promise.all([
          fetchAnalyticsData(firestore),
          fetchUserGrowthMetrics(firestore),
          fetchSubscriptionStats(firestore),
          fetchActivityByHour(firestore)
        ]);

        setAnalyticsData(analytics);
        setUserGrowth(growth);
        setSubStats(subs);
        setTrafficData(traffic);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [firestore]);

  if (isLoading || !analyticsData || !subStats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Calculate percentages for subscription bars
  const totalUsers = subStats.trial + subStats.premium + subStats.expired;
  const trialPct = totalUsers ? Math.round((subStats.trial / totalUsers) * 100) : 0;
  // const premiumPct = totalUsers ? Math.round((subStats.premium / totalUsers) * 100) : 0; // Breakdown below
  const expiredPct = totalUsers ? Math.round((subStats.expired / totalUsers) * 100) : 0;

  const epayPct = totalUsers ? Math.round((subStats.paymentDistribution.epay / totalUsers) * 100) : 0;
  const cashPct = totalUsers ? Math.round((subStats.paymentDistribution.cash / totalUsers) * 100) : 0;

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
          title="Premium Users"
          value={subStats.premium.toString()}
          icon={<CreditCard className="h-4 w-4" />}
          description={`${epayPct}% Epay, ${cashPct}% Cash`}
        />
        <StatsCard
          title="System Status"
          value={analyticsData.systemStatus === 'healthy' ? "Operational" : "Degraded"}
          icon={<Server className="h-4 w-4" />}
          description="API & Database"
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

      <div className="grid gap-4 md:grid-cols-2">
        {/* Traffic Distribution (Real Data) */}
        <Card>
          <CardHeader>
            <CardTitle>Peak Traffic Times</CardTitle>
            <CardDescription>Activity by time of day (24h)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              {trafficData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trafficData}>
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  Not enough activity data.
                </div>
              )}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground px-2">
              <span>00:00</span>
              <span>12:00</span>
              <span>23:59</span>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Distribution (Real Data) */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>User base distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  Premium (Epay)
                </span>
                <span className="font-bold">{subStats.paymentDistribution.epay} ({epayPct}%)</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${epayPct}%` }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-indigo-500" />
                  Premium (Cash)
                </span>
                <span className="font-bold">{subStats.paymentDistribution.cash} ({cashPct}%)</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${cashPct}%` }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  Free Trial
                </span>
                <span className="font-bold">{subStats.trial} ({trialPct}%)</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${trialPct}%` }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  Expired / Free
                </span>
                <span className="font-bold">{subStats.expired} ({expiredPct}%)</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${expiredPct}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
