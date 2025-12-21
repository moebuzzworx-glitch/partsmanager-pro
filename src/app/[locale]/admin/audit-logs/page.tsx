'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useFirebase } from "@/firebase/provider";
import { useEffect, useState } from "react";
import { fetchAuditLogs } from "@/lib/admin-analytics";

interface AuditLog {
  id: string;
  action: string;
  userId: string;
  details: string;
  resource: string;
  timestamp: any;
  ipAddress?: string;
}

export default function AdminAuditLogsPage() {
  const { firestore } = useFirebase();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    const loadLogs = async () => {
      try {
        const auditLogs = await fetchAuditLogs(firestore, 100);
        setLogs(auditLogs);
      } catch (error) {
        console.error('Error loading audit logs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLogs();
  }, [firestore]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'add':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'update':
      case 'edit':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'delete':
      case 'remove':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'login':
      case 'logout':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-headline font-bold">Audit Logs</h1>
        <p className="text-muted-foreground mt-2">Track all system activity and changes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>View all user actions and system events ({logs.length} total)</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Timestamp</th>
                    <th className="text-left py-3 px-4 font-semibold">Action</th>
                    <th className="text-left py-3 px-4 font-semibold">User</th>
                    <th className="text-left py-3 px-4 font-semibold">Resource</th>
                    <th className="text-left py-3 px-4 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-secondary/50 transition-colors">
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {log.timestamp ? new Date(log.timestamp.toDate?.() || log.timestamp).toLocaleString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{log.userId}</td>
                      <td className="py-3 px-4 text-muted-foreground">{log.resource || '—'}</td>
                      <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No audit logs available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
