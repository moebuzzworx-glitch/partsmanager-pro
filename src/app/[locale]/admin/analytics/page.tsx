'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Loader2, TrendingUp, Package, AlertTriangle } from "lucide-react";
import { useFirebase } from "@/firebase/provider";
import { useEffect, useState } from "react";
import { 
  fetchAnalyticsData, 
  fetchSalesMetrics, 
  fetchInventoryMetrics,
  AnalyticsData,
  SalesMetrics,
  InventoryMetrics
} from "@/lib/admin-analytics";

export default function AdminAnalyticsPage() {
  const { firestore } = useFirebase();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [salesMetrics, setSalesMetrics] = useState<SalesMetrics[]>([]);
  const [inventoryMetrics, setInventoryMetrics] = useState<InventoryMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    const loadData = async () => {
      try {
        const [analytics, sales, inventory] = await Promise.all([
          fetchAnalyticsData(firestore),
          fetchSalesMetrics(firestore, 30),
          fetchInventoryMetrics(firestore, 20),
        ]);
        
        setAnalyticsData(analytics);
        setSalesMetrics(sales);
        setInventoryMetrics(inventory);
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
        <h1 className="text-3xl font-headline font-bold">Analytics & Reports</h1>
        <p className="text-muted-foreground mt-2">Business metrics and insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Revenue"
          value={`$${analyticsData.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<TrendingUp className="h-4 w-4" />}
          description={`${analyticsData.totalOrders} orders`}
        />
        <StatsCard
          title="Average Order Value"
          value={analyticsData.totalOrders > 0 ? `$${(analyticsData.totalRevenue / analyticsData.totalOrders).toFixed(2)}` : '$0.00'}
          icon={<TrendingUp className="h-4 w-4" />}
          description="Per transaction"
        />
        <StatsCard
          title="Total Products"
          value={analyticsData.totalProducts.toString()}
          icon={<Package className="h-4 w-4" />}
          description="In inventory"
        />
        <StatsCard
          title="Low Stock Items"
          value={analyticsData.lowStockProducts.toString()}
          icon={<AlertTriangle className="h-4 w-4" />}
          description="Need attention"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Sales Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Trends</CardTitle>
            <CardDescription>Revenue over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {salesMetrics.length > 0 ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p className="mb-2">Daily breakdown:</p>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {salesMetrics.map((metric) => (
                      <div key={metric.date} className="flex justify-between items-center text-xs">
                        <span>{metric.date}</span>
                        <div className="flex gap-4">
                          <span className="text-green-600">${metric.revenue.toFixed(2)}</span>
                          <span className="text-blue-600">{metric.ordersCount} orders</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No sales data available</p>
            )}
          </CardContent>
        </Card>

        {/* Inventory Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Alerts</CardTitle>
            <CardDescription>Items below 20 units</CardDescription>
          </CardHeader>
          <CardContent>
            {inventoryMetrics.length > 0 ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Product</th>
                        <th className="text-right py-2">Stock</th>
                        <th className="text-right py-2">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryMetrics.map((item) => (
                        <tr key={item.productName} className="border-b hover:bg-secondary/50">
                          <td className="py-2 text-left">{item.productName}</td>
                          <td className="text-right text-orange-600 font-semibold">{item.stock}</td>
                          <td className="text-right">${item.value.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">All items well stocked</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analyticsData.activeUsers}</p>
            <p className="text-xs text-muted-foreground mt-2">Registered accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analyticsData.totalCustomers}</p>
            <p className="text-xs text-muted-foreground mt-2">In the system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Suppliers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analyticsData.totalSuppliers}</p>
            <p className="text-xs text-muted-foreground mt-2">Active suppliers</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
