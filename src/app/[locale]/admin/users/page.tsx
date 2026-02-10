'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Users, UserPlus, Globe, Crown } from "lucide-react"; // Added icons
import { useFirebase } from "@/firebase/provider";
import { useEffect, useState } from "react";
import { fetchAllUsers, deleteUser, UserProfile } from "@/lib/user-management";
import { EditUserDialog } from "@/components/admin/edit-user-dialog";
import { CreateUserDialog } from "@/components/admin/create-user-dialog";
import { StatsCard } from "@/components/dashboard/stats-card"; // Added StatsCard
import { Input } from "@/components/ui/input";
import { collection, getDocs } from "firebase/firestore";
import type { AccessRightProfile } from "@/lib/access-rights";
import { PageAccessGuard } from "@/components/admin/page-access-guard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function AdminUsersPageContent() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [accessRights, setAccessRights] = useState<Map<string, AccessRightProfile>>(new Map());

  const loadUsers = async () => {
    if (!firestore) return;
    try {
      setIsLoading(true);
      const fetchedUsers = await fetchAllUsers(firestore);
      setUsers(fetchedUsers);

      // Load access rights
      const accessRightsRef = collection(firestore, 'accessRights');
      const snapshot = await getDocs(accessRightsRef);
      const rightsMap = new Map<string, AccessRightProfile>();
      snapshot.forEach((doc) => {
        const data = doc.data() as AccessRightProfile;
        rightsMap.set(doc.id, data);
      });
      setAccessRights(rightsMap);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [firestore]);

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!firestore) return;

    setIsDeleting(userId);
    try {
      const success = await deleteUser(firestore, userId);
      if (success) {
        setUsers(users.filter(u => u.id !== userId));
        toast({
          title: 'Success',
          description: `User ${userName} deleted successfully`,
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete user',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate quick stats
  const totalUsers = users.length;
  const newUsersToday = users.filter(u => {
    const created = u.createdAt?.toDate?.() || u.createdAt;
    if (!created) return false;
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    return created >= today;
  }).length;

  const onlineUsers = users.filter(u => {
    // @ts-ignore - lastActiveAt might not be in the interface yet
    const lastActive = u.lastActiveAt?.toDate?.() || u.lastActiveAt;
    const lastLogin = u.lastLoginAt?.toDate?.() || u.lastLoginAt;

    const recentActivity = lastActive || lastLogin;
    if (!recentActivity) return false;

    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    return recentActivity > fifteenMinsAgo;
  }).length;

  const premiumUsers = users.filter(u => u.subscription === 'premium').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-headline font-bold">User Management</h1>
        <p className="text-muted-foreground mt-2">Manage users, roles, subscriptions, and permissions</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={totalUsers.toString()}
          icon={<Users className="h-4 w-4" />}
          description="All registered accounts"
        />
        <StatsCard
          title="New Today"
          value={`+${newUsersToday}`}
          icon={<UserPlus className="h-4 w-4 text-green-500" />}
          description="Registrations today"
        />
        <StatsCard
          title="Online Now"
          value={onlineUsers.toString()}
          icon={<Globe className="h-4 w-4 text-blue-500" />}
          description="Active in last 15m"
        />
        <StatsCard
          title="Premium Members"
          value={premiumUsers.toString()}
          icon={<Crown className="h-4 w-4 text-yellow-500" />}
          description="Active subscriptions"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>View and manage all system users ({users.length} total)</CardDescription>
            </div>
            <CreateUserDialog onUserCreated={loadUsers} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />

          {filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Access Rights</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-secondary/50">
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={user.subscription === 'premium' ? 'default' : user.subscription === 'expired' ? 'destructive' : 'secondary'}>
                          {user.subscription === 'premium' ? 'Premium' : user.subscription === 'expired' ? 'Expired' : 'Trial'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'destructive' : 'outline'}>
                          {user.role === 'admin' ? 'Admin' : 'User'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.role === 'admin' && user.accessRightId ? (
                          <Badge variant="secondary">
                            {accessRights.get(user.accessRightId)?.name || 'Unknown'}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                          {user.status === 'suspended' ? 'Suspended' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.createdAt
                          ? new Date(user.createdAt.toDate?.() || user.createdAt).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <EditUserDialog user={user} onUserUpdated={loadUsers} />

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={user.role === 'admin' || isDeleting === user.id}
                              title={user.role === 'admin' ? 'Cannot delete admin accounts' : ''}
                            >
                              {isDeleting === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {user.name || user.email}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteUser(user.id, user.name || user.email)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              {users.length === 0 ? 'No users found. Create one to get started!' : 'No users match your search.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <PageAccessGuard requiredPermission="users" requiredActions={['view']}>
      <AdminUsersPageContent />
    </PageAccessGuard>
  );
}
