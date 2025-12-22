'use client';

import dynamic from 'next/dynamic';

// Lazy load the actual dialog to prevent server-side jsPDF bundling
const CreateInvoiceDialogLazy = dynamic(
  () => import('./create-invoice-dialog').then(mod => ({
    default: mod.CreateInvoiceDialog
  })),
  { ssr: false }
);

export function CreateInvoiceDialogWrapper(props: any) {
  return <CreateInvoiceDialogLazy {...props} />;
}
