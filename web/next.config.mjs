/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    optimizePackageImports: ["@mui/material", "@mui/icons-material", "@emotion/react", "@emotion/styled"],
  },
};

export default nextConfig;
