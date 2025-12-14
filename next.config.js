/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',

  // Note: headers() doesn't work with static export
  // Security headers should be configured at the web server level (nginx, etc.)
  // or through a _headers file for platforms like Netlify/Vercel
}

module.exports = nextConfig
