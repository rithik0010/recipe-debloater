import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Explicitly opt-in to Turbopack (Next.js 16 default)
  turbopack: {},

  // Allow external image sources
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.youtube.com' },
      { protocol: 'https', hostname: '**.ytimg.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },

  // Increase API route timeout for video processing
  serverExternalPackages: ['youtube-transcript', '@distube/ytdl-core'],

  // Custom headers for security
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: (process.env.ALLOWED_ORIGIN || '*').trim() },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;
