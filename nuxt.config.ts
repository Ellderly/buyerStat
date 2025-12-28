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
      title: 'Media Buying Analytics',
      meta: [
        { name: 'description', content: 'Analytics system for media buying teams' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap' }
      ]
    }
  },

  compatibilityDate: '2024-11-01',
})
