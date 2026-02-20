/** @type {import('next').NextConfig} */
const nextConfig = {
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
