import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  nitro: {
    preset: 'vercel',
  },
  runtimeConfig: {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
    mongodbUri: process.env.MONGODB_URI ?? '',
    mongodbDbName: process.env.MONGODB_DB_NAME ?? 'yummydog',
    ollamaParserUrl: process.env.OLLAMA_PARSER_URL ?? '',
    productAiWorkerUrl: process.env.PRODUCT_AI_WORKER_URL ?? '',
    productAiWorkerToken: process.env.PRODUCT_AI_WORKER_TOKEN ?? '',
    public: {
      stripePublishableKey: process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  app: {
    head: {
      title: 'YummyDog',
      meta: [
        { name: 'description', content: 'YummyDog — order fresh hot dogs from your phone' },
        { name: 'theme-color', content: '#e63946' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, viewport-fit=cover' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/icon.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'apple-touch-icon', href: '/icon.png' },
      ],
    },
  },
})
