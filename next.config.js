module.exports = {
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