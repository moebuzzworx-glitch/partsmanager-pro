'use client';

import { useSidebar } from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';

export function MobileTriggerLogo() {
    const { toggleSidebar, isMobile } = useSidebar();

    const handleClick = (e: React.MouseEvent) => {
        // Only toggle sidebar on mobile when clicking the logo
        // On desktop, logo is static (or could link home)
        if (isMobile) {
            e.preventDefault();
            toggleSidebar();
        }
    };

    return (
        <button
            onClick={handleClick}
            className="md:cursor-default cursor-pointer focus:outline-none flex items-center"
            type="button"
            aria-label="Toggle Sidebar"
        >
            <Logo />
        </button>
    );
}
