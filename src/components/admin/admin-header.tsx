'use client';

import { Logo } from "@/components/logo";
import { UserNav } from "@/components/dashboard/user-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Headphones } from "lucide-react";
import { useBotStore } from '@/hooks/use-bot-store';
import { Locale } from "@/lib/config";
import { AdminNotificationDropdown } from "./admin-notification-dropdown";

interface AdminHeaderProps {
    user: any; // Using any for now to avoid extensive type imports if user object structure varies
    locale: Locale;
    dictionary: any;
}

function SupportButton() {
    const { openBot } = useBotStore();

    return (
        <Button variant="ghost" size="icon" onClick={() => openBot()}>
            <Headphones className="h-[1.2rem] w-[1.2rem]" />
            <span className="sr-only">Support</span>
        </Button>
    );
}

export function AdminHeader({ user, locale, dictionary }: AdminHeaderProps) {
    return (
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
            <SidebarTrigger className="-ml-2" />
            <div className="flex items-center gap-2">
                <Logo />
                <span className="hidden md:inline-flex px-2 py-0.5 rounded-md bg-destructive/10 text-destructive text-xs font-bold uppercase tracking-wider border border-destructive/20">
                    Administrator
                </span>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
                <SupportButton />
                <LanguageSwitcher />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            <span className="sr-only">Toggle theme</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <ThemeSwitcher />
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Reusing existing notification system component logic specifically for admin layout if needed, 
                    OR simplified since admins SEND notifications primarily. 
                    However, admins also receive system alerts. 
                    We'll separate this logic to keep the main file clean. */}
                <AdminNotificationDropdown locale={locale} />

                {user && (
                    <UserNav
                        user={{
                            ...user,
                            name: user.email,
                            avatarUrl: '',
                            createdAt: user.createdAt as any
                        }}
                        dictionary={dictionary.auth}
                        locale={locale}
                    />
                )}
            </div>
        </header>
    );
}
