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

}

module.exports = nextConfig