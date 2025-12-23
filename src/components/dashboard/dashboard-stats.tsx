'use client';

import { useEffect, useState } from 'react';
import { StatsCard } from './stats-card';
import { Banknote, Package, ShoppingCart, TrendingUp } from 'lucide-react';
import { useFirebase } from '@/firebase/provider';
import { fetchKPIMetrics, type KPIMetrics } from '@/lib/kpi-utils';

interface DashboardStatsProps {
  dictionary: any;
}

export function DashboardStats({ dictionary }: DashboardStatsProps) {
  const { firestore } = useFirebase();
  const [stats, setStats] = useState<KPIMetrics>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalSalesToday: 0,
    totalProducts: 0,
    lowStockItems: 0,
    paidInvoices: 0,
    unpaidInvoices: 0,
    totalSales: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const kpiMetrics = await fetchKPIMetrics(firestore);
        setStats(kpiMetrics);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [firestore]);

  const formatRevenue = (revenue: number) => {
    if (revenue >= 1000000) {
      return `${(revenue / 1000000).toFixed(2)}M`;
    } else if (revenue >= 1000) {
      return `${(revenue / 1000).toFixed(2)}K`;
    }
    return revenue.toFixed(2);
  };

  const getNetProfitColor = (netProfit: number) => {
    if (netProfit > 0) return 'text-green-600';
    if (netProfit < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title={dictionary.dashboard.revenue || 'Total Revenue'}
        value={isLoading ? '--' : `${formatRevenue(stats.totalRevenue)} DZD`}
        icon={<Banknote className="h-4 w-4" />}
        description="Income from paid invoices & sales"
      />
      <StatsCard
        title="Net Profit"
        value={isLoading ? '--' : `${formatRevenue(stats.netProfit)} DZD`}
        icon={<TrendingUp className={`h-4 w-4 ${getNetProfitColor(stats.netProfit)}`} />}
        description={`Revenue ${stats.totalRevenue.toFixed(0)} - Expenses ${stats.totalExpenses.toFixed(0)}`}
      />
      <StatsCard
        title={dictionary.dashboard.salesToday || 'Sales Today'}
        value={isLoading ? '--' : `+${stats.totalSalesToday}`}
        icon={<ShoppingCart className="h-4 w-4" />}
        description="Sales completed today"
      />
      <StatsCard
        title={dictionary.dashboard.totalProducts || 'Total Products'}
        value={isLoading ? '--' : `${stats.totalProducts} / ${stats.lowStockItems} low`}
        icon={<Package className="h-4 w-4" />}
        description="Items needing reorder"
      />
    </div>
  );
}
