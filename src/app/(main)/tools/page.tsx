import React from 'react';
import { PageHeader } from '@/components/page-header';
import { StockAdjustmentTool } from './stock-adjustment-tool';

export default function ToolsPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Tools"
        description="Utilities to streamline your store management."
      />
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="grid gap-6">
          <StockAdjustmentTool />
        </div>
      </main>
    </div>
  );
}
