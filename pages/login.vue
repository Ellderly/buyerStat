<template>
  <NuxtLayout name="auth">
    <div class="login-container">
      <!-- Background effects -->
      <div class="bg-effects">
        <div class="gradient-orb orb-1"></div>
        <div class="gradient-orb orb-2"></div>
        <div class="gradient-orb orb-3"></div>
      </div>

      <!-- Login Card -->
      <div class="login-card">
        <div class="card-header">
          <div class="logo">
            <UIcon name="i-heroicons-chart-bar-square" class="logo-icon" />
          </div>
          <h1 class="title">Garage Team</h1>
          <p class="subtitle">Система аналитики</p>
        </div>

        <form @submit.prevent="handleLogin" class="login-form">
          <UFormGroup label="Логин" name="username">
            <UInput
              v-model="form.username"
              type="text"
              placeholder="Введите логин"
              icon="i-heroicons-user"
              size="lg"
              :disabled="isLoading"
            />
          </UFormGroup>

          <UFormGroup label="Пароль" name="password">
            <UInput
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              icon="i-heroicons-lock-closed"
              size="lg"
              :disabled="isLoading"
              :ui="{ icon: { trailing: { pointer: '' } } }"
            >
              <template #trailing>
                <UButton
                  :icon="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                  variant="ghost"
                  color="gray"
                  size="xs"
                  @click="showPassword = !showPassword"
                />
              </template>
            </UInput>
          </UFormGroup>

          <UAlert
            v-if="error"
            color="red"
            variant="soft"
            :title="error"
            icon="i-heroicons-exclamation-triangle"
            class="error-alert"
          />

          <UButton
            type="submit"
            block
            size="lg"
            :loading="isLoading"
            class="login-button"
          >
            <template #leading>
              <UIcon v-if="!isLoading" name="i-heroicons-arrow-right-on-rectangle" />
            </template>
            Войти в систему
          </UButton>
        </form>

        <div class="card-footer">
          <p class="footer-text">
            Нет доступа? Обратитесь к администратору
          </p>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

const router = useRouter()

const form = reactive({
  username: '',
  password: ''
})

const showPassword = ref(false)
const isLoading = ref(false)
const error = ref('')

const handleLogin = async () => {
  error.value = ''
  isLoading.value = true

  try {
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: form
    })

    if (response.success) {
      if (response.user?.role === 'FINANCIER') {
        await navigateTo('/finance')
      } else {
        await navigateTo('/dashboard')
      }
    }
  } catch (e: any) {
    error.value = e.data?.message || 'Ошибка входа. Проверьте данные.'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-container {
  position: relative;
  width: 100%;
  max-width: 420px;
}

.bg-effects {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
}

.orb-1 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  top: -100px;
  right: -100px;
  animation: float 8s ease-in-out infinite;
}

.orb-2 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #0ea5e9, #06b6d4);
  bottom: -50px;
  left: -50px;
  animation: float 10s ease-in-out infinite reverse;
}

.orb-3 {
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg, #f43f5e, #ec4899);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-20px) scale(1.05); }
}

.login-card {
  position: relative;
  background: rgba(15, 15, 35, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.5rem;
  padding: 2.5rem;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.card-header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2));
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 1rem;
  margin-bottom: 1rem;
}

.logo-icon {
  width: 2rem;
  height: 2rem;
  color: #a5b4fc;
}

.title {
  font-size: 1.75rem;
  font-weight: 700;
  background: linear-gradient(135deg, #e2e8f0, #94a3b8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #64748b;
  font-size: 0.875rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.error-alert {
  margin-top: 0.5rem;
}

.login-button {
  margin-top: 0.5rem;
  background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
  font-weight: 600;
}

.login-button:hover {
  background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
}

.card-footer {
  margin-top: 1.5rem;
  text-align: center;
}

.footer-text {
  color: #475569;
  font-size: 0.813rem;
}
</style>
