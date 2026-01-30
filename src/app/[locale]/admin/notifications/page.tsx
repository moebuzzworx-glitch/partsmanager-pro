'use client';

import { useState } from 'react';
import { useFirebase } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { sendTargetedNotifications, TargetAudience } from '@/lib/notifications-admin';
import { Loader2, Send } from 'lucide-react';
import { UserRole } from '@/lib/types';

export default function NotificationsPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'info' | 'success' | 'warning' | 'error' | 'alert'>('info');
    const [targetAudience, setTargetAudience] = useState<TargetAudience>('all');
    const [targetRole, setTargetRole] = useState<UserRole>('user');

    const [isSending, setIsSending] = useState(false);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !message.trim()) {
            toast({
                title: "Validation Error",
                description: "Please fill in all required fields.",
                variant: "destructive",
            });
            return;
        }

        if (!firestore) return;

        setIsSending(true);

        try {
            const result = await sendTargetedNotifications(
                firestore,
                title,
                message,
                type,
                {
                    subscription: targetAudience,
                    role: targetRole,
                }
            );

            if (result.success) {
                toast({
                    title: "Notifications Sent",
                    description: `Successfully sent to ${result.count} users.`,
                });
                // Reset form
                setTitle('');
                setMessage('');
                setType('info');
            } else {
                throw result.error;
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to send notifications. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Notification Center</h2>
                    <p className="text-muted-foreground">Send targeted notifications to your users.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Compose Notification</CardTitle>
                        <CardDescription>Create a new notification to send to users.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSend} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    placeholder="Notification Title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="message">Message</Label>
                                <Textarea
                                    id="message"
                                    placeholder="Type your message here..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={4}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="type">Type</Label>
                                <Select value={type} onValueChange={(v: any) => setType(v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="info">Info</SelectItem>
                                        <SelectItem value="success">Success</SelectItem>
                                        <SelectItem value="warning">Warning</SelectItem>
                                        <SelectItem value="error">Error</SelectItem>
                                        <SelectItem value="alert">Alert</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="audience">Target Audience (Subscription)</Label>
                                    <Select value={targetAudience} onValueChange={(v: any) => setTargetAudience(v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select audience" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Subscriptions</SelectItem>
                                            <SelectItem value="trial">Trial Users</SelectItem>
                                            <SelectItem value="premium">Premium Users</SelectItem>
                                            <SelectItem value="expired">Expired Users</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role">Target Role</Label>
                                    <Select value={targetRole} onValueChange={(v: any) => setTargetRole(v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="user">User</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Button type="submit" disabled={isSending} className="w-full">
                                {isSending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        Send Notification
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Preview</CardTitle>
                        <CardDescription>How the notification matches will be targeted.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="rounded-lg border p-4 bg-muted/50">
                            <h4 className="font-semibold mb-2">Target Summary</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                <li><strong>Title:</strong> {title || '(No title)'}</li>
                                <li><strong>Type:</strong> <span className={`capitalize ${type === 'error' || type === 'alert' ? 'text-red-500' :
                                    type === 'warning' ? 'text-yellow-500' :
                                        type === 'success' ? 'text-green-500' : 'text-blue-500'
                                    }`}>{type}</span></li>
                                <li><strong>Role:</strong> {targetRole === 'user' ? 'Regular Users' : 'Administrators'}</li>
                                <li><strong>Subscription:</strong> {targetAudience === 'all' ? 'All Plans' : targetAudience.charAt(0).toUpperCase() + targetAudience.slice(1)}</li>
                            </ul>
                        </div>

                        <div className="rounded-lg border p-4">
                            <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Notification Preview</h4>
                            <div className="flex gap-3 p-3 rounded-md bg-secondary/50 border">
                                <div className={`h-2 w-2 rounded-full mt-2 shrink-0 ${type === 'error' || type === 'alert' ? 'bg-red-500' :
                                    type === 'warning' ? 'bg-yellow-500' :
                                        type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                                    }`} />
                                <div>
                                    <p className="font-medium text-sm">{title || "Notification Title"}</p>
                                    <p className="text-xs text-muted-foreground">{message || "Notification message will appear here..."}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">Just now</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
