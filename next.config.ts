import type { NextConfig } from 'next';
import path from 'node:path';

const isDev = process.env.NODE_ENV !== 'production';

// Content-Security-Policy. Next.js injects inline bootstrap scripts, so
// 'unsafe-inline' is required for script-src unless a nonce-based CSP is added
// via middleware. 'unsafe-eval' is only enabled in development (React Fast Refresh).
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root so a stray lockfile in a parent directory is never picked up.
  outputFileTracingRoot: path.resolve(__dirname),
  turbopack: { root: path.resolve(__dirname) },
  poweredByHeader: false,
  // Self-contained server bundle for the Docker image.
  output: 'standalone',
  async redirects() {
    // The four role pages used to live at top-level paths; they were older
    // copies of the canonical dashboards and are now permanent redirects.
    return [
      { source: '/district-officer', destination: '/district/dashboard', permanent: true },
      { source: '/facility-manager', destination: '/facility/dashboard', permanent: true },
      { source: '/state-admin', destination: '/state/dashboard', permanent: true },
      { source: '/authenticated-dashboard', destination: '/roles', permanent: true },
      { source: '/website-manager', destination: '/admin/dashboard', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
