  // next.config.js
// Configures the Next.js app
// The webpack section prevents build errors caused by ethers.js/web3 trying
// to use Node.js-only modules (fs, net, tls) in the browser

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;