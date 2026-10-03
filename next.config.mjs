/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // ESLint is independently verified via `npm run lint`
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
