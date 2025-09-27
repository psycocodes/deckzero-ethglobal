/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: getCsp(),
          },
        ],
      },
    ];
  },
};

function getCsp() {
  const csp = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' *.walletconnect.com;
    child-src 'none';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: *.walletconnect.com https://*.githubusercontent.com https://*.coinbase.com;
    font-src 'self';
    connect-src 'self' https://*.walletconnect.com wss://*.walletconnect.com https://rpc.walletconnect.com https://*.infura.io https://*.alchemy.com;
    frame-src *.walletconnect.com;
  `;
  return csp.replace(/\s{2,}/g, ' ').trim();
}

export default nextConfig;