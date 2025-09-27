import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      // Unity game headers
      {
        source: "/games/:path*/Build/:file*.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript",
          },
        ],
      },

      // Content Security Policy for wallet connections
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              // Allow scripts from self and wallet providers
              "script-src 'self' https://www.googletagmanager.com 'unsafe-inline' 'unsafe-eval';",
              // Allow connections to WalletConnect/Web3Modal and others
              "connect-src 'self' https://*.walletconnect.com wss://*.walletconnect.com https://relay.walletconnect.com https://*.walletlink.org wss://*.walletlink.org https://*.metamask.io;",
              "object-src 'none';",
              "base-uri 'self';",
              // Allow images from WalletConnect/Web3Modal
              "img-src 'self' data: blob: https://*.walletconnect.com https://*.web3modal.com;",
            ].join(' '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;