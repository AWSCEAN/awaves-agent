import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';

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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
