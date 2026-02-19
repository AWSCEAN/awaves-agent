/** @type {import('next').NextConfig} */
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';

const nextConfig = {
  transpilePackages: ['@shared/types'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Static export requires unoptimized images
    ...(isCapacitorBuild && { unoptimized: true }),
  },
  // Static export for Capacitor mobile builds
  ...(isCapacitorBuild && { output: 'export' }),
};

module.exports = nextConfig;
