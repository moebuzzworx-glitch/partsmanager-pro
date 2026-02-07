'use client';

import { useState, useEffect } from 'react';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from '@/firebase/provider';
import { doc, getDoc } from 'firebase/firestore';
import { compare } from 'bcryptjs';
import { useRouter } from 'next/navigation';

interface ProtectedActionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => Promise<void> | void;
    title?: string;
    description?: string;
    resourceName?: string;
    dictionary?: any;
}

export function ProtectedActionDialog({
    open,
    onOpenChange,
    onConfirm,
    title = "Are you absolutely sure?",
    description = "This action cannot be undone.",
    resourceName,
    dictionary
}: ProtectedActionDialogProps) {
    const { user, firestore } = useFirebase();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(false); // New state for initial check
    const [hasPasswordSet, setHasPasswordSet] = useState<boolean | null>(null); // New state
    const [error, setError] = useState('');
    const { toast } = useToast();
    const router = useRouter();

    // Check if password is set when dialog opens
    useEffect(() => {
        if (open && user && firestore) {
            setCheckingAuth(true);
            const checkSettings = async () => {
                try {
                    const userRef = doc(firestore, 'users', user.uid);
                    const userDoc = await getDoc(userRef);
                    const hash = userDoc.data()?.deletionPassword;
                    setHasPasswordSet(!!hash);
                } catch (e) {
                    console.error(e);
                    setHasPasswordSet(false); // Assume false on error to be safe? Or error state?
                } finally {
                    setCheckingAuth(false);
                }
            };
            checkSettings();
        } else {
            // Reset state when closed
            if (!open) {
                setPassword('');
                setError('');
                setHasPasswordSet(null);
            }
        }
    }, [open, user, firestore]);

    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!user || !firestore) {
            setError('Authentication not ready.');
            return;
        }

        setLoading(true);

        try {
            // 1. Verify password via Client SDK
            const userRef = doc(firestore, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            const storedHash = userDoc.data()?.deletionPassword;

            if (storedHash) {
                const isValid = await compare(password, storedHash);
                if (!isValid) {
                    setError(dictionary?.settings?.incorrectPassword || 'Incorrect deletion password');
                    setLoading(false);
                    return;
                }
            } else {
                // Should not happen if we block checkingAuth, but double check
                setError('No deletion password set. Please set one in settings.');
                setLoading(false);
                return;
            }

            // 2. Perform action
            await onConfirm();
            onOpenChange(false);
            setPassword(''); // Reset
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleGoToSettings = () => {
        onOpenChange(false);
        router.push('/dashboard/settings?tab=security');
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                {checkingAuth ? (
                    <div className="flex flex-col items-center justify-center py-8 space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Checking security settings...</p>
                    </div>
                ) : hasPasswordSet === false ? (
                    // Password NOT set state
                    <>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5 text-amber-500" />
                                {dictionary?.settings?.deletionPasswordRequired || 'Deletion Password Required'}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {dictionary?.settings?.deletionPasswordRequiredDesc || 'To ensure security, you must set a deletion password before you can delete items.'}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4">
                            <p className="text-sm text-muted-foreground">
                                {dictionary?.settings?.deletionPasswordGoToSettings || 'Please go to the Security Settings page to configure your password.'}
                            </p>
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{dictionary?.common?.cancel || 'Cancel'}</AlertDialogCancel>
                            <Button onClick={handleGoToSettings}>
                                {dictionary?.settings?.goToSettings || 'Go to Settings'}
                            </Button>
                        </AlertDialogFooter>
                    </>
                ) : (
                    // Password SET state (Normal flow)
                    <>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                {title}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {description}
                                {resourceName && <span className="block mt-1 font-medium">Item: {resourceName}</span>}
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <form onSubmit={handleConfirm} className="py-4 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="deletion-password">{dictionary?.settings?.enterDeletionPassword || 'Enter Deletion Password'}</Label>
                                <Input
                                    id="deletion-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={dictionary?.settings?.deletionPasswordPlaceholder || "Required to confirm deletion"}
                                    autoFocus
                                />
                                {error && <p className="text-sm text-destructive">{error}</p>}
                            </div>

                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={loading} onClick={() => {
                                    setPassword('');
                                    setError('');
                                }}>{dictionary?.common?.cancel || 'Cancel'}</AlertDialogCancel>
                                <Button type="submit" variant="destructive" disabled={loading || !password}>
                                    {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                    {dictionary?.settings?.confirmDelete || 'Confirm Delete'}
                                </Button>
                            </AlertDialogFooter>
                        </form>
                    </>
                )}
            </AlertDialogContent>
        </AlertDialog>
    );
}
