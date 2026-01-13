// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  
  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
  ],

  colorMode: {
    preference: 'dark',
  },

  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production',
  },

  app: {
    head: {
      title: 'Garage Team Analytics',
      meta: [
        { name: 'description', content: 'Analytics system for Garage Team' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🏎️</text></svg>' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap' }
      ]
    }
  },

  compatibilityDate: '2024-11-01',
})
