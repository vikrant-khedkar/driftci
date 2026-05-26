import type { NextConfig } from 'next';

const config: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
  typescript: { ignoreBuildErrors: false },
  // Allow importing TS files from outside the web/ root
  transpilePackages: [],
};

export default config;
