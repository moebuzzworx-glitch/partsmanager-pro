import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 sm:p-6 border-b">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" />
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <SupportButton />
        {actions}
      </div>
    </div>
  );
}

import { useBotStore } from '@/hooks/use-bot-store';
import { Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';

function SupportButton() {
  const store = useBotStore();

  React.useEffect(() => {
    console.group('SupportButton Debug');
    console.log('Mounted');
    console.log('Store state:', store);
    console.log('Window width:', window.innerWidth);

    // Check computed style to see if hidden
    const btn = document.getElementById('header-support-btn');
    if (btn) {
      const style = window.getComputedStyle(btn);
      console.log('Computed display:', style.display);
      console.log('Classes:', btn.className);
      if (style.display === 'none') {
        console.warn('Support button is hidden via CSS (likely "hidden md:flex" class)');
      }
    } else {
      console.error('Support button element not found in DOM');
    }
    console.groupEnd();
  }, [store]);

  if (!store || !store.openBot) {
    console.error('Bot store not initialized correctly');
    return null;
  }

  return (
    <Button
      id="header-support-btn"
      variant="outline"
      size="sm"
      className="hidden md:flex gap-2"
      onClick={() => {
        console.log('Support button clicked');
        store.openBot();
      }}
    >
      <Headphones size={16} />
      Support
    </Button>
  );
}
