/** @type {import('next').NextConfig} */
const nextConfig = {
  // Trust proxy headers for production deployment behind nginx
  eslint: {
    // Disables ESLint during the build process
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Enable webpack polling for file changes in Docker/WSL2
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    return config
  },
}

module.exports = nextConfig