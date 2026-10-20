import createNextIntlPlugin from 'next-intl/plugin';
import { resolveWebReleaseConfig } from './release-config.mjs';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.RENDO_BUILD_DIR || '.next',
  env: { NEXT_PUBLIC_RENDO_BETA_MODE: String(process.env.RENDO_BETA_MODE === 'true') },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    const { apiOrigin } = resolveWebReleaseConfig();
    return [
      {
        source: '/api/:path*',
        destination: `${apiOrigin}/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
