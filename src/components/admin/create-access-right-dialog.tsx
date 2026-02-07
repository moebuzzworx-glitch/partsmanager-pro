'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, PlusCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { AccessRightProfile } from '@/lib/access-rights';

const createAccessRightSchema = z.object({
  name: z.string().min(1, 'Name is required').min(3, 'Name must be at least 3 characters'),
  description: z.string().min(1, 'Description is required'),
  // Dashboard
  dashboardView: z.boolean(),
  // Users
  usersView: z.boolean(),
  usersCreate: z.boolean(),
  usersEdit: z.boolean(),
  usersDelete: z.boolean(),
  // Analytics
  analyticsView: z.boolean(),
  // Reports
  reportsView: z.boolean(),
  // Audit Logs
  auditLogsView: z.boolean(),
  // System Settings
  systemSettingsView: z.boolean(),
  systemSettingsEdit: z.boolean(),
  // Data Management
  dataManagementView: z.boolean(),
  // Security
  securityView: z.boolean(),
  // Access Rights
  accessRightsView: z.boolean(),
  accessRightsCreate: z.boolean(),
  accessRightsEdit: z.boolean(),
  accessRightsDelete: z.boolean(),
});

type FormValues = z.infer<typeof createAccessRightSchema>;

interface CreateAccessRightDialogProps {
  onAccessRightCreated?: () => void;
}

export default function CreateAccessRightDialog({ onAccessRightCreated }: CreateAccessRightDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(createAccessRightSchema),
    defaultValues: {
      name: '',
      description: '',
      dashboardView: true,
      usersView: true,
      usersCreate: false,
      usersEdit: false,
      usersDelete: false,
      analyticsView: true,
      reportsView: true,
      auditLogsView: true,
      systemSettingsView: false,
      systemSettingsEdit: false,
      dataManagementView: false,
      securityView: false,
      accessRightsView: false,
      accessRightsCreate: false,
      accessRightsEdit: false,
      accessRightsDelete: false,
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!firestore || !user) return;

    try {
      setIsLoading(true);

      const newAccessRight: Omit<AccessRightProfile, 'id'> = {
        name: values.name,
        description: values.description,
        isTemplate: false,
        permissions: {
          dashboard: { view: values.dashboardView },
          users: {
            view: values.usersView,
            create: values.usersCreate,
            edit: values.usersEdit,
            delete: values.usersDelete,
          },
          analytics: { view: values.analyticsView },
          reports: { view: values.reportsView },
          auditLogs: { view: values.auditLogsView },
          systemSettings: { view: values.systemSettingsView, edit: values.systemSettingsEdit },
          dataManagement: { view: values.dataManagementView },
          security: { view: values.securityView },
          accessRights: {
            view: values.accessRightsView,
            create: values.accessRightsCreate,
            edit: values.accessRightsEdit,
            delete: values.accessRightsDelete,
          },
        },
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      };

      const docRef = await addDoc(
        collection(firestore, 'accessRights'),
        newAccessRight
      );

      toast({
        title: 'Success',
        description: `Access right "${values.name}" created successfully`,
      });

      form.reset();
      setOpen(false);
      onAccessRightCreated?.();
    } catch (error) {
      console.error('Error creating access right:', error);
      toast({
        title: 'Error',
        description: 'Failed to create access right. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="h-4 w-4 me-2" />
          Create Access Right
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Access Right Profile</DialogTitle>
          <DialogDescription>
            Define what admin pages and features this user role can access
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Basic Information</h3>
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Content Manager" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Can manage users and view reports" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Admin Features */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Admin Features Access</h3>

              {/* Dashboard */}
              <FormField
                control={form.control}
                name="dashboardView"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Dashboard</FormLabel>
                      <FormDescription>Access to the main admin dashboard</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {/* Users Management */}
              <div className="rounded-md border p-4 space-y-3">
                <h4 className="font-medium">Users Management</h4>
                <FormField
                  control={form.control}
                  name="usersView"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">View users</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="usersCreate"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Create users</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="usersEdit"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Edit users</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="usersDelete"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Delete users</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              {/* Analytics */}
              <FormField
                control={form.control}
                name="analyticsView"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Analytics</FormLabel>
                      <FormDescription>View analytics and statistics</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {/* Reports */}
              <FormField
                control={form.control}
                name="reportsView"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Reports</FormLabel>
                      <FormDescription>View system reports</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {/* Audit Logs */}
              <FormField
                control={form.control}
                name="auditLogsView"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Audit Logs</FormLabel>
                      <FormDescription>View activity and audit logs</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {/* System Settings */}
              <div className="rounded-md border p-4 space-y-3">
                <h4 className="font-medium">System Settings</h4>
                <FormField
                  control={form.control}
                  name="systemSettingsView"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">View settings</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="systemSettingsEdit"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Edit settings</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              {/* Data Management */}
              <FormField
                control={form.control}
                name="dataManagementView"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Data Management</FormLabel>
                      <FormDescription>Access data management and backup features</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {/* Security */}
              <FormField
                control={form.control}
                name="securityView"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Security</FormLabel>
                      <FormDescription>View security settings and configurations</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {/* Access Rights Management */}
              <div className="rounded-md border p-4 space-y-3">
                <h4 className="font-medium">Access Rights Management</h4>
                <FormField
                  control={form.control}
                  name="accessRightsView"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">View access rights</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accessRightsCreate"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Create access rights</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accessRightsEdit"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Edit access rights</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accessRightsDelete"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Delete access rights</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                Create Access Right
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
