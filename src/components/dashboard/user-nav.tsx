'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User as UserIcon, Palette, Loader2 } from 'lucide-react';
import UserProfileModal from './user-profile-modal';
import type { User } from '@/lib/types';
import { type getDictionary } from '@/lib/dictionaries';
import { usePathname } from 'next/navigation';
import { ThemeSwitcher } from '../theme-switcher';
import { useAuth } from '@/firebase/provider';
import { signOut } from '@/firebase/auth-functions';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export function UserNav({
  user,
  dictionary,
}: {
  user: User;
  dictionary: Awaited<ReturnType<typeof getDictionary>>['auth'];
}) {
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'en';
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    if (!auth) return;

    try {
      setIsLoggingOut(true);
      await signOut(auth);
      
      toast({
        title: 'Logged Out',
        description: 'You have been signed out successfully.',
      });

      router.push(`/${locale}/login`);
    } catch (error: any) {
      console.error('Logout error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to logout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatarUrl} alt={user.name || user.email} />
            <AvatarFallback>{(user.name || user.email).charAt(0)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <UserProfileModal open={false} onOpenChange={() => {}} />
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name || user.email}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setProfileOpen(true)}>
          <UserIcon className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          <span>{dictionary.logout}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
      <UserProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
    </DropdownMenu>
  );
}
