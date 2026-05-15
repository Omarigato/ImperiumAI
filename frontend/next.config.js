/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three'],
  // Required for Docker standalone build
  output: 'standalone',
};

module.exports = nextConfig;