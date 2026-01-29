'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSidebar, SidebarMenuButton } from '@/components/ui/sidebar';

interface SidebarNavLinkProps {
    href: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    isActive?: boolean; // Optional if we want to handle active state styling later
}

export function SidebarNavLink({ href, icon, children, isActive }: SidebarNavLinkProps) {
    const { isMobile, setOpenMobile } = useSidebar();

    const handleClick = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    return (
        <SidebarMenuButton asChild isActive={isActive}>
            <Link href={href} onClick={handleClick}>
                {icon}
                <span>{children}</span>
            </Link>
        </SidebarMenuButton>
    );
}
