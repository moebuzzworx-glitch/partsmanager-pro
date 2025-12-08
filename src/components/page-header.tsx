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
         <SidebarTrigger className="md:hidden"/>
         <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">{title}</h1>
            {description && <p className="text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
