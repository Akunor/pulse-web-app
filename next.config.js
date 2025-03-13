/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Ensure reset-password page is included in the build
  async rewrites() {
    return [
      {
        source: '/reset-password',
        destination: '/reset-password',
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'query',
            key: 'error',
            value: 'access_denied',
          },
        ],
        permanent: false,
        destination: '/reset-password',
      },
    ];
  },
}

module.exports = nextConfig 