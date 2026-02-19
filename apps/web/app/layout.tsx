import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import CapacitorInit from '@/components/CapacitorInit';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'AWAVES - Find Your Perfect Wave',
  description: 'AI-powered surf spot discovery for Korea and beyond',
  keywords: ['surf', 'surfing', 'waves', 'korea', 'surf spots', 'wave forecast'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-sand-50">
        <Providers>
          <CapacitorInit />
          {children}
        </Providers>
      </body>
    </html>
  );
}
