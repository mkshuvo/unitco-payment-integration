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
    const target = inDocker ? 'http://api:3000' : 'http://localhost:3000';
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
