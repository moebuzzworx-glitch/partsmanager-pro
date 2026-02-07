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
import { PlusCircle, Loader2 } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase/provider';
import { createUser } from '@/lib/user-management';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import type { AccessRightProfile } from '@/lib/access-rights';
import { useAdminAccessRights } from '@/hooks/use-admin-access-rights';

const createUserSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  subscription: z.enum(['trial', 'premium'], {
    errorMap: () => ({ message: 'Select a valid subscription' }),
  }),
  role: z.enum(['user', 'admin'], {
    errorMap: () => ({ message: 'Select a valid role' }),
  }),
  accessRightId: z.string().optional(),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

interface CreateUserDialogProps {
  onUserCreated?: () => void;
}

export function CreateUserDialog({ onUserCreated }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const [isLoading, setIsLoading] = useState(false);
  const [accessRights, setAccessRights] = useState<AccessRightProfile[]>([]);
  const [isLoadingAccessRights, setIsLoadingAccessRights] = useState(false);
  const { canCreate } = useAdminAccessRights();

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      name: '',
      password: '',
      subscription: 'trial',
      role: 'user',
      accessRightId: 'none',
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

  const onSubmit = async (data: CreateUserFormData) => {
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
      // Create Firebase Auth user
      const auth = getAuth();
      const userCred = await createUserWithEmailAndPassword(auth, data.email, data.password);

      // Create Firestore user document
      const userData: any = {
        email: data.email,
        name: data.name,
        subscription: data.subscription,
        role: data.role,
        emailVerified: true, // Admin-created users are automatically verified
      };

      // Add access right ID if user is admin and one is selected
      if (data.role === 'admin' && data.accessRightId && data.accessRightId !== 'none') {
        userData.accessRightId = data.accessRightId;
      }

      const success = await createUser(firestore, userCred.user.uid, userData);

      if (success) {
        toast({
          title: 'Success',
          description: `User ${data.name} created successfully`,
        });
        form.reset();
        setOpen(false);
        onUserCreated?.();
      } else {
        // Delete the auth user if Firestore creation failed
        await userCred.user.delete();
        toast({
          title: 'Error',
          description: 'Failed to create user profile. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      let errorMessage = 'Failed to create user';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={!canCreate('users')}>
          <PlusCircle className="h-4 w-4 me-2" />
          Create User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Create a new user account with email and initial settings.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
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
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
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
                      <SelectItem value="trial">Trial (Free - 5 days)</SelectItem>
                      <SelectItem value="premium">Premium (5000 DA/year)</SelectItem>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger disabled={isLoadingAccessRights}>
                          {isLoadingAccessRights ? (
                            <>
                              <Loader2 className="me-2 h-4 w-4 animate-spin" />
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
                      Assign an access rights profile to control what this admin can do
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

