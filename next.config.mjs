import path from 'path';

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true
  },
  eslint: {
    ignoreDuringBuilds: false
  }
};

export default nextConfig;
