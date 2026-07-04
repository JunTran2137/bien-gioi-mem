/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three'],
  // Allow dev requests from the LAN IP (phones connecting over Wi-Fi/HTTPS).
  allowedDevOrigins: ['192.168.110.143'],
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3']
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }
    ]
  }
};

module.exports = nextConfig;
