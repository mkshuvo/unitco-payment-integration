/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    optimizePackageImports: ["@mui/material", "@mui/icons-material", "@emotion/react", "@emotion/styled"],
  },
  async rewrites() {
    const inDocker = !!process.env.DOCKER || process.env.NODE_ENV === 'production';
    // In Docker, talk to the api service by name. In local dev, prefer NEXT_PUBLIC_API_URL
    // if provided, otherwise default to localhost:3000 (Nest dev default).
    const target = inDocker
      ? 'http://api:3000'
      : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000');
    return [
      {
        source: '/api/:path*',
        destination: `${target}/api/:path*`,
      },
      {
        source: '/integration/:path*',
        destination: `${target}/integration/:path*`,
      },
    ];
  },
};

export default nextConfig;
