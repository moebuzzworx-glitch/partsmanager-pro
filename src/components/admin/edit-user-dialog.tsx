'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Edit, Loader2 } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase/provider';
import { updateUser, UserProfile } from '@/lib/user-management';
import { collection, getDocs } from 'firebase/firestore';
import type { AccessRightProfile } from '@/lib/access-rights';

const editUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  subscription: z.enum(['trial', 'premium', 'expired'], {
    errorMap: () => ({ message: 'Select a valid subscription' }),
  }),
  role: z.enum(['user', 'admin'], {
    errorMap: () => ({ message: 'Select a valid role' }),
  }),
  status: z.enum(['active', 'suspended'], {
    errorMap: () => ({ message: 'Select a valid status' }),
  }),
  accessRightId: z.string().optional(),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

interface EditUserDialogProps {
  user: UserProfile;
  onUserUpdated?: () => void;
}

export function EditUserDialog({ user, onUserUpdated }: EditUserDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const [isLoading, setIsLoading] = useState(false);
  const [accessRights, setAccessRights] = useState<AccessRightProfile[]>([]);
  const [isLoadingAccessRights, setIsLoadingAccessRights] = useState(false);

  const form = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: user.name || '',
      email: user.email || '',
      subscription: user.subscription || 'trial',
      role: user.role || 'user',
      status: user.status || 'active',
      accessRightId: user.accessRightId || 'none',
    },
  });

  const role = form.watch('role');

  // Load access rights when dialog opens or role changes
  useEffect(() => {
    if (open && role === 'admin') {
      loadAccessRights();
    }
  }, [open, role]);

  const loadAccessRights = async () => {
    if (!firestore) return;

    try {
      setIsLoadingAccessRights(true);
      const accessRightsRef = collection(firestore, 'accessRights');
      const snapshot = await getDocs(accessRightsRef);

      const rights: AccessRightProfile[] = [];
      snapshot.forEach((doc) => {
        rights.push(doc.data() as AccessRightProfile);
      });

      // Sort by name
      rights.sort((a, b) => a.name.localeCompare(b.name));
      setAccessRights(rights);
    } catch (error) {
      console.error('Error loading access rights:', error);
      toast({
        title: 'Warning',
        description: 'Could not load access rights templates',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingAccessRights(false);
    }
  };

  const onSubmit = async (data: EditUserFormData) => {
    if (!firestore) {
      toast({
        title: 'Error',
        description: 'Firestore not initialized',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const updateData: any = {
        ...data,
      };

      // If user is not admin or no access right selected, remove accessRightId
      if (data.role !== 'admin' || data.accessRightId === 'none') {
        updateData.accessRightId = null;
      }

      const success = await updateUser(firestore, user.id, updateData);

      if (success) {
        toast({
          title: 'Success',
          description: `User ${data.name} updated successfully`,
        });
        setOpen(false);
        onUserUpdated?.();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update user. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information, subscription, role, status, and access rights.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="User name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subscription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subscription</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="trial">Trial (Free - 10 days)</SelectItem>
                      <SelectItem value="premium">Premium (5000 DA/year)</SelectItem>
                      <SelectItem value="expired">Expired (No Access)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin (App Manager)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {role === 'admin' && (
              <FormField
                control={form.control}
                name="accessRightId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Rights</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || 'none'}>
                      <FormControl>
                        <SelectTrigger disabled={isLoadingAccessRights}>
                          {isLoadingAccessRights ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <SelectValue placeholder="Select access rights..." />
                          )}
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No specific access rights</SelectItem>
                        {accessRights.map((right) => (
                          <SelectItem key={right.id} value={right.id}>
                            {right.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Control what this admin can do across the system
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update User
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
