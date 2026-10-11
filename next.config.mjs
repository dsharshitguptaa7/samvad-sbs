/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // ESLint is independently verified via `npm run lint`
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    const fastApiUrl = process.env.FASTAPI_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${fastApiUrl}/api/:path*`,
        },
      ],
    };
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        source: "/(admin|student|coordinator|department-head|director|api/admin|api/student|api/coordinator|api/department-head|api/director|api/protected|api/documents)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
