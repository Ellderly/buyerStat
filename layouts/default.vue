<template>
  <div class="default-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <UIcon name="i-heroicons-chart-bar-square" class="logo-icon" />
          <span class="logo-text">MBAnalytics</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <NuxtLink to="/dashboard" class="nav-item" active-class="active">
          <UIcon name="i-heroicons-squares-2x2" />
          <span>Dashboard</span>
        </NuxtLink>
        <NuxtLink to="/statistics" class="nav-item" active-class="active">
          <UIcon name="i-heroicons-table-cells" />
          <span>Статистика</span>
        </NuxtLink>
        <NuxtLink to="/results" class="nav-item" active-class="active">
          <UIcon name="i-heroicons-document-chart-bar" />
          <span>Результаты</span>
        </NuxtLink>
        <NuxtLink v-if="isAdmin" to="/admin" class="nav-item" active-class="active">
          <UIcon name="i-heroicons-cog-6-tooth" />
          <span>Управление</span>
        </NuxtLink>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <UAvatar :text="userInitials" size="sm" />
          <div class="user-details">
            <span class="user-name">{{ userName }}</span>
            <span class="user-role">{{ userRole }}</span>
          </div>
        </div>
        <UButton 
          icon="i-heroicons-arrow-right-on-rectangle" 
          variant="ghost" 
          color="gray"
          @click="logout"
        />
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()

// TODO: Get from auth store (or fetch directly as we do here)
const userName = ref('')
const userRole = ref('')
const isAdmin = computed(() => userRole.value === 'ADMIN')

const userInitials = computed(() => {
  return userName.value ? userName.value.split(' ').map(n => n[0]).join('').toUpperCase() : '??'
})

const fetchUser = async () => {
  try {
    const data = await $fetch<{ user: any }>('/api/auth/me')
    if (data.user) {
      userName.value = data.user.name
      userRole.value = data.user.role
    }
  } catch (error) {
    console.error('Failed to fetch user')
  }
}

const logout = async () => {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
  } catch (e) {
    // ignore
  }
  window.location.href = '/login'
}

onMounted(() => {
  fetchUser()
})
</script>

<style scoped>
.default-layout {
  display: flex;
  min-height: 100vh;
  background: #0a0a0f;
}

.sidebar {
  width: 260px;
  background: linear-gradient(180deg, #12121a 0%, #0d0d14 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 50;
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  width: 2rem;
  height: 2rem;
  color: #6366f1;
}

.logo-text {
  font-size: 1.25rem;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.sidebar-nav {
  flex: 1;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  color: #94a3b8;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: rgba(99, 102, 241, 0.1);
  color: #e2e8f0;
}

.nav-item.active {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2));
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.sidebar-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #e2e8f0;
}

.user-role {
  font-size: 0.75rem;
  color: #64748b;
}

.main-content {
  flex: 1;
  margin-left: 260px;
  padding: 2rem;
  background: #0a0a0f;
  min-height: 100vh;
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  
  .main-content {
    margin-left: 0;
  }
}
</style>
