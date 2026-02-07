'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock } from "lucide-react";
import { useFirebase } from '@/firebase/provider';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { hash, compare } from 'bcryptjs';

export function SecuritySettings({ dictionary }: { dictionary?: any }) {
    const { user, firestore } = useFirebase();
    const [hasPassword, setHasPassword] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const { toast } = useToast();

    // Fetch existing settings
    useEffect(() => {
        if (!user || !firestore) {
            // If checking auth takes time, keep loading. If no user, maybe stop?
            // Assuming protected route, user exists eventually.
            return;
        }

        const checkPassword = async () => {
            try {
                const userRef = doc(firestore, 'users', user.uid);
                const userDoc = await getDoc(userRef);
                if (userDoc.exists() && userDoc.data().deletionPassword) {
                    setHasPassword(true);
                } else {
                    setHasPassword(false);
                }
            } catch (err) {
                console.error("Error fetching settings:", err);
            } finally {
                setLoading(false);
            }
        };

        checkPassword();
    }, [user, firestore]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user || !firestore) return;

        if (newPassword !== confirmPassword) {
            toast({ title: 'Error', description: dictionary?.settings?.passwordsDoNotMatch || "Passwords do not match", variant: "destructive" });
            return;
        }

        if (newPassword.length < 4) {
            toast({ title: dictionary?.common?.error || 'Error', description: dictionary?.settings?.shortPassword || "Password must be at least 4 characters", variant: "destructive" });
            return;
        }

        setSubmitting(true);
        try {
            const userRef = doc(firestore, 'users', user.uid);

            // Verify current password if exists
            if (hasPassword) {
                const userDoc = await getDoc(userRef);
                const currentHash = userDoc.data()?.deletionPassword;

                if (currentHash) {
                    const isValid = await compare(currentPassword, currentHash);
                    if (!isValid) {
                        throw new Error(dictionary?.settings?.incorrectPassword || 'Incorrect current password');
                    }
                }
            }

            // Hash and save new password
            const hashedPassword = await hash(newPassword, 10);
            await updateDoc(userRef, { deletionPassword: hashedPassword });

            toast({
                title: 'Success',
                description: hasPassword ? (dictionary?.settings?.passwordUpdated || "Deletion password updated") : (dictionary?.settings?.passwordSet || "Deletion password set successfully")
            });

            setHasPassword(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error(error);
            toast({ title: 'Error', description: error.message, variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{dictionary?.settings?.securityTitle || 'Security'}</CardTitle>
                <CardDescription>
                    {hasPassword
                        ? (dictionary?.settings?.changeDeletionPasswordDesc || 'Change your deletion password. This password is required for deleting items.')
                        : (dictionary?.settings?.setDeletionPasswordDesc || 'Set a password to protect deletion actions across the app.')}
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    {hasPassword && (
                        <div className="space-y-2">
                            <Label htmlFor="current-password">{dictionary?.settings?.currentPassword || 'Current Password'}</Label>
                            <Input
                                id="current-password"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                            />
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="new-password">{hasPassword ? (dictionary?.settings?.newPassword || 'New Password') : (dictionary?.settings?.password || 'Password')}</Label>
                        <Input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">{dictionary?.settings?.confirmPassword || 'Confirm Password'}</Label>
                        <Input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={submitting}>
                        {submitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                        {hasPassword ? (dictionary?.settings?.updatePassword || 'Update Password') : (dictionary?.settings?.setPassword || 'Set Password')}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
