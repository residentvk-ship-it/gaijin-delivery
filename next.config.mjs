import withPWA from 'next-pwa'

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: false,   // было true — убираем принудительный захват контроля
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // Говорим Next.js не трогать nodemailer вебпаком — он должен
  // оставаться обычным Node.js модулем, иначе в standalone-сборке
  // он молча ломается и письма не отправляются.
  experimental: {
    serverComponentsExternalPackages: ['nodemailer'],
  },
    

  images: {
    formats: ['image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 7,
    deviceSizes: [390, 768, 1024, 1280],
    imageSizes: [64, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.u4kuduk.ru',
      },
      {
        protocol: 'https',
        hostname: 'u4kuduk.ru',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default pwaConfig(nextConfig)