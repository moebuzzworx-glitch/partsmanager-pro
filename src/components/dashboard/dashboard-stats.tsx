'use client';

import { useEffect, useState } from 'react';
import { StatsCard } from './stats-card';
import { Banknote, Package, ShoppingCart, TrendingUp } from 'lucide-react';
import { useFirebase } from '@/firebase/provider';
import { fetchKPIMetrics, type KPIMetrics } from '@/lib/kpi-utils';
import { sendLowStockNotifications } from '@/lib/low-stock-notifications';

interface DashboardStatsProps {
  dictionary: any;
}

export function DashboardStats({ dictionary }: DashboardStatsProps) {
  const { firestore, user } = useFirebase();
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
    if (!firestore || !user?.uid) return;

    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const kpiMetrics = await fetchKPIMetrics(firestore, user.uid);
        setStats(kpiMetrics);
        
        // Trigger low stock notifications based on current KPI awareness
        sendLowStockNotifications(firestore, 10).catch(error => 
          console.warn('Failed to send low stock notifications:', error)
        );
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [firestore, user?.uid]);

  const formatRevenue = (revenue: number) => {
    const millionAbbrev = dictionary.dashboard?.million || 'M';
    const thousandAbbrev = dictionary.dashboard?.thousand || 'K';
    
    if (revenue >= 1000000) {
      return `${(revenue / 1000000).toFixed(2)}${millionAbbrev}`;
    } else if (revenue >= 1000) {
      return `${(revenue / 1000).toFixed(2)}${thousandAbbrev}`;
    }
    return revenue.toFixed(2);
  };

  const getNetProfitColor = (netProfit: number) => {
    if (netProfit > 0) return 'text-green-600';
    if (netProfit < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const currency = dictionary.dashboard?.currency || 'DZD';

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title={dictionary.dashboard?.totalRevenue || 'Total Revenue'}
        value={isLoading ? '--' : `${formatRevenue(stats.totalRevenue)} ${currency}`}
        icon={<Banknote className="h-4 w-4" />}
        description={dictionary.dashboard?.totalRevenueDesc || 'Income from paid invoices & sales'}
      />
      <StatsCard
        title={dictionary.dashboard?.netProfit || 'Net Profit'}
        value={isLoading ? '--' : `${formatRevenue(stats.netProfit)} ${currency}`}
        icon={<TrendingUp className={`h-4 w-4 ${getNetProfitColor(stats.netProfit)}`} />}
        description={(dictionary.dashboard?.netProfitDesc || 'Revenue {revenue} - Expenses {expenses}')
          .replace('{revenue}', stats.totalRevenue.toFixed(0))
          .replace('{expenses}', stats.totalExpenses.toFixed(0))
        }
      />
      <StatsCard
        title={dictionary.dashboard?.salesToday || 'Today\'s Sales'}
        value={isLoading ? '--' : `+${stats.totalSalesToday}`}
        icon={<ShoppingCart className="h-4 w-4" />}
        description={dictionary.dashboard?.salesTodayDesc || 'Sales completed today'}
      />
      <StatsCard
        title={dictionary.dashboard?.totalProducts || 'Total Products'}
        value={isLoading ? '--' : `${stats.totalProducts} / ${stats.lowStockItems} ${dictionary.dashboard?.lowStockLabel || 'low'}`}
        icon={<Package className="h-4 w-4" />}
        description={dictionary.dashboard?.totalProductsDesc || 'Items needing reorder'}
      />
    </div>
  );
}
