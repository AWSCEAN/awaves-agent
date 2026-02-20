import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import BottomNav from '@/components/BottomNav';
import CloudWatchRUM from '@/components/CloudWatchRUM';

export const metadata: Metadata = {
  title: 'awaves - Find Your Perfect Wave',
  description: 'AI-powered surf spot discovery for Korea and beyond',
  keywords: ['surf', 'surfing', 'waves', 'korea', 'surf spots', 'wave forecast'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#094074',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-sand-50">
        <CloudWatchRUM />
        <Providers>
          {children}
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
