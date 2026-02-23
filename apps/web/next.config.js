/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  assetPrefix: process.env.NEXT_PUBLIC_CDN_URL || '',
  // No allowedDevOrigins needed: emulator now uses adb reverse, so it accesses
  // http://localhost:3000 — same origin as the dev server. No cross-origin issue.
  transpilePackages: ['@shared/types'],
  compress: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
