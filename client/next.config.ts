/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Apply these headers to all routes in your application.
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            // This is a comprehensive policy covering Web3Modal, WalletConnect, Coinbase, and common RPCs.
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://*.walletconnect.com https://api.web3modal.org https://static.cloudflareinsights.com",
              "style-src 'self' 'unsafe-inline' https://*.walletconnect.com https://api.web3modal.org https://fonts.googleapis.com",
              "img-src 'self' data: https://*.walletconnect.com https://*.githubusercontent.com https://*.coinbase.com https://api.web3modal.org",
              `connect-src 'self' https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org https://rpc.walletconnect.com https://*.infura.io https://*.alchemy.com https://api.web3modal.org https://*.merkle.io https://pulse.walletconnect.org https://cca-lite.coinbase.com wss://www.walletlink.org`,
              "frame-src 'self' https://*.walletconnect.com https://*.walletconnect.org",
              "font-src 'self' data: https://fonts.gstatic.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;