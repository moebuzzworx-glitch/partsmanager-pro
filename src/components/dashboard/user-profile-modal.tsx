"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { reauthenticateWithCredential, EmailAuthProvider, updatePassword, updateProfile } from 'firebase/auth';
import { saveUserSettings } from '@/lib/settings-utils';

export function UserProfileModal({ children, open: controlledOpen, onOpenChange }: { children?: React.ReactNode; open?: boolean; onOpenChange?: (v: boolean) => void }) {
  const { firebaseApp, auth, firestore, user } = useFirebase() as any;
  const { toast } = useToast();
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = typeof controlledOpen === 'boolean' ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (typeof onOpenChange === 'function') onOpenChange(v);
    else setInternalOpen(v);
  };

  const form = useForm({ defaultValues: { displayName: '', currentPassword: '', newPassword: '', confirmPassword: '' } });

  useEffect(() => {
    if (user) {
      form.reset({ displayName: user.name || '' });
    }
  }, [user]);

  async function onSubmit(values: any) {
    try {
      // Update display name in Auth and user doc
      if (values.displayName && auth && user) {
        try {
          if (auth.currentUser) await updateProfile(auth.currentUser, { displayName: values.displayName });
        } catch (e) {
          // ignore - fallback
        }
        try {
          if (firestore && user.uid) {
            await saveUserSettings(firestore, user.uid, { displayName: values.displayName });
          }
        } catch (e) {
          // ignore
        }
      }

      // Change password if provided
      if (values.newPassword) {
        if (!values.currentPassword) throw new Error('Current password required to change password');
        if (!auth || !auth.currentUser) throw new Error('Authentication not available');
        const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, values.newPassword);
      }

      toast({ title: 'Profile updated' });
      // Force token refresh so onIdTokenChanged will update auth consumers
      try {
        if (auth && auth.currentUser && typeof auth.currentUser.getIdToken === 'function') {
          await auth.currentUser.getIdToken(true);
        }
      } catch (e) {
        // ignore
      }

      try {
        window.dispatchEvent(new CustomEvent('app:settings-updated', { detail: { uid: user?.uid } }));
      } catch (e) {}

      // Refresh the route to apply changes across the app; fallback to full reload
      try {
        router.refresh();
      } catch (e) {
        try { window.location.reload(); } catch {}
      }

      setOpen(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update profile', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* If children provided and uncontrolled, render trigger */}
      {!controlledOpen && children ? (
        <DialogTrigger asChild>{children}</DialogTrigger>
      ) : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Change your display name or password (reauth required).</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField name="displayName" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )} />

            <FormField name="currentPassword" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Current Password</FormLabel>
                <FormControl>
                  <Input {...field} type="password" />
                </FormControl>
              </FormItem>
            )} />

            <FormField name="newPassword" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <Input {...field} type="password" />
                </FormControl>
              </FormItem>
            )} />

            <FormField name="confirmPassword" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm New Password</FormLabel>
                <FormControl>
                  <Input {...field} type="password" />
                </FormControl>
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default UserProfileModal;
