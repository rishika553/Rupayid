const isDev = process.env.NODE_ENV !== 'production';

function originOf(url) {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

const apiOrigin = originOf(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1');

// Google Identity Services (sign-in) and Razorpay Checkout are the only third-party scripts.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://accounts.google.com https://*.razorpay.com`,
  "style-src 'self' 'unsafe-inline' https://accounts.google.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin} https://*.r2.cloudflarestorage.com https://accounts.google.com https://*.razorpay.com${isDev ? ' ws: http://localhost:*' : ''}`,
  'frame-src https://accounts.google.com https://*.razorpay.com',
  "form-action 'self' https://*.razorpay.com",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  transpilePackages: ['@rupayaid/ui', '@rupayaid/types'],
  experimental: {
    optimizePackageImports: ['lucide-react', '@rupayaid/ui'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.cloudflare.com',
      },
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = nextConfig;
