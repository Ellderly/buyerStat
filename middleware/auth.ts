export default defineNuxtRouteMiddleware(async (to) => {
  // Skip on login page
  if (to.path === '/login') return

  try {
    const { data } = await useFetch<{ user: any }>('/api/auth/me')
    
    if (!data.value?.user) {
      return navigateTo('/login')
    }

    // FINANCIER can only access /finance
    if (data.value.user.role === 'FINANCIER' && to.path !== '/finance') {
      return navigateTo('/finance')
    }
  } catch {
    return navigateTo('/login')
  }
})
