/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // Configure static export
  images: {
    unoptimized: true // Required for static export
  },
  // Remove rewrites since they don't work with static export
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

module.exports = nextConfig; 