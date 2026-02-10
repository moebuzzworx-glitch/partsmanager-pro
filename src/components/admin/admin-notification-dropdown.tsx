'use client';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { Locale } from "@/lib/config";

// Reusing logic from dashboard layout but contained for admin context
export function AdminNotificationDropdown({ locale }: { locale: Locale }) {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex justify-between items-center">
                    <span>System Alerts</span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() => markAllAsRead()}
                        >
                            Mark all as read
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length > 0 ? (
                    <div className="max-h-96 overflow-y-auto space-y-2 p-2">
                        {notifications.map((notification) => {
                            const getIcon = () => {
                                switch (notification.type) {
                                    case 'success':
                                        return <CheckCircle className="h-4 w-4 text-green-600" />;
                                    case 'error':
                                    case 'alert':
                                    case 'low-stock-alert':
                                        return <AlertCircle className="h-4 w-4 text-red-600" />;
                                    case 'warning':
                                        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
                                    default:
                                        return <Info className="h-4 w-4 text-blue-600" />;
                                }
                            };

                            // Check pin status (admin view of pinned items)
                            const isPinned = notification.pinned && (!notification.pinExpiresAt || (notification.pinExpiresAt.toDate?.() || new Date(notification.pinExpiresAt as any)).getTime() > Date.now());

                            return (
                                <DropdownMenuItem
                                    key={notification.id}
                                    className={`flex flex-col items-start gap-2 p-3 rounded-md cursor-pointer ${isPinned ? 'bg-amber-50/50 hover:bg-amber-100/50 border-l-2 border-amber-400' : 'bg-secondary/50 hover:bg-secondary'
                                        }`}
                                    onClick={() => markAsRead(notification.id)}
                                >
                                    <div className="flex gap-2 w-full">
                                        {getIcon()}
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">
                                                {notification.translations?.[locale]?.title || notification.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {notification.translations?.[locale]?.message || notification.message}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {notification.createdAt
                                                    ? new Date(
                                                        notification.createdAt.toDate?.() || notification.createdAt
                                                    ).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })
                                                    : 'Just now'}
                                            </p>
                                        </div>
                                        {!notification.read && (
                                            <div className="h-2 w-2 bg-blue-600 rounded-full mt-1 flex-shrink-0"></div>
                                        )}
                                    </div>
                                </DropdownMenuItem>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No system alerts
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
