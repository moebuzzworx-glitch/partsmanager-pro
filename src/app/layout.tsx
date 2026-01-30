import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import { RootLayoutClient } from './layout-client';
import './globals.css';

export const metadata: Metadata = {
  title: 'PartsManager Pro',
  description: 'Revolutionize Your Parts Management',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700&family=Roboto:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <RootLayoutClient>
          {children}
          <Toaster />
        </RootLayoutClient>
      </body>
    </html>
  );
}
