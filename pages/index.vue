<template>
  <div></div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

// Redirect to dashboard or login
onMounted(async () => {
  try {
    const { data } = await useFetch<{ user: any }>('/api/auth/me')
    if (data.value?.user) {
      await navigateTo('/dashboard')
    } else {
      await navigateTo('/login')
    }
  } catch {
    await navigateTo('/login')
  }
})
</script>

