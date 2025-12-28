export default defineNuxtRouteMiddleware(async (to) => {
  // Skip on login page
  if (to.path === '/login') return

  try {
    const { data } = await useFetch<{ user: any }>('/api/auth/me')
    
    if (!data.value?.user) {
      return navigateTo('/login')
    }
  } catch {
    return navigateTo('/login')
  }
})

