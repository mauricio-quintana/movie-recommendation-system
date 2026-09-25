import type { NextConfig } from 'next';

// Rewrites are resolved at build time: in Docker this is provided as a build argument.
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'image.tmdb.org', pathname: '/t/p/**' }],
    // TMDB already serves resized images (w185…w780): no need to re-optimise them.
    unoptimized: true,
  },
  async rewrites() {
    // Same-origin proxy to the NestJS API so the Better Auth session cookie is first-party.
    return [{ source: '/api/:path*', destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
