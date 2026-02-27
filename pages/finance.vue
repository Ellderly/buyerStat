<template>
  <div class="finance-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Финансы</h1>
        <p class="page-subtitle">Расходы по сотрудникам и источникам</p>
      </div>
    </header>

    <!-- Filters -->
    <div class="filters-card">
      <div class="filters-grid">
        <UFormGroup label="Период">
          <USelectMenu
            v-model="period"
            :options="periodOptions"
            option-attribute="label"
            value-attribute="value"
            @change="applyPeriod"
          />
        </UFormGroup>

        <UFormGroup v-if="period === 'custom'" label="Дата от">
          <UInput v-model="filters.startDate" type="date" />
        </UFormGroup>

        <UFormGroup v-if="period === 'custom'" label="Дата до">
          <UInput v-model="filters.endDate" type="date" />
        </UFormGroup>

        <UFormGroup label="Сотрудник">
          <USelectMenu
            v-model="filters.userId"
            :options="[{ id: '', name: 'Все сотрудники' }, ...employees]"
            option-attribute="name"
            value-attribute="id"
            placeholder="Все сотрудники"
          />
        </UFormGroup>

        <UFormGroup label="Источник">
          <USelectMenu
            v-model="filters.source"
            :options="sourceOptions"
            option-attribute="label"
            value-attribute="value"
            placeholder="Все источники"
          />
        </UFormGroup>
      </div>

      <div class="filters-actions">
        <UButton variant="soft" @click="resetFilters">Сбросить</UButton>
        <UButton @click="fetchData">Применить</UButton>
      </div>
    </div>

    <!-- Total Spend -->
    <div class="totals-grid">
      <div class="total-card spend">
        <span class="total-label">Общие расходы</span>
        <span class="total-value">${{ totalSpend.toFixed(2) }}</span>
      </div>
      <div class="total-card records">
        <span class="total-label">Записей</span>
        <span class="total-value">{{ pagination.total }}</span>
      </div>
    </div>

    <!-- Per-source breakdown -->
    <div v-if="sourceBreakdown.length > 0" class="source-breakdown">
      <div v-for="item in sourceBreakdown" :key="item.source" class="total-card">
        <span class="total-label">
          <UBadge :color="getSourceColor(item.source)" variant="soft" size="xs">
            {{ item.source }}
          </UBadge>
        </span>
        <span class="total-value">${{ item.spend.toFixed(2) }}</span>
      </div>
    </div>

    <!-- Table -->
    <div class="table-card">
      <UTable
        :rows="statistics"
        :columns="columns"
        :loading="isLoading"
        :empty-state="{ icon: 'i-heroicons-circle-stack-20-solid', label: 'Нет данных за выбранный период' }"
      >
        <template #date-data="{ row }">
          {{ formatDate(row.date) }}
        </template>

        <template #userName-data="{ row }">
          <span class="text-gray-300">{{ row.user?.name || '-' }}</span>
        </template>

        <template #source-data="{ row }">
          <UBadge :color="getSourceColor(row.source)" variant="soft">
            {{ row.source }}
          </UBadge>
        </template>

        <template #spend-data="{ row }">
          <span class="text-red-400">${{ row.spend.toFixed(2) }}</span>
        </template>
      </UTable>

      <!-- Pagination -->
      <div class="pagination-wrapper">
        <div class="pagination-info">
          <span>Показано {{ paginationStart }}-{{ paginationEnd }} из {{ pagination.total }}</span>
        </div>
        <div class="pagination-controls">
          <USelectMenu
            v-model="pagination.limit"
            :options="limitOptions"
            option-attribute="label"
            value-attribute="value"
            @change="onLimitChange"
            class="per-page-select"
          />
          <div class="page-buttons">
            <UButton
              icon="i-heroicons-chevron-double-left"
              size="xs"
              variant="ghost"
              :disabled="pagination.page === 1"
              @click="goToPage(1)"
            />
            <UButton
              icon="i-heroicons-chevron-left"
              size="xs"
              variant="ghost"
              :disabled="pagination.page === 1"
              @click="goToPage(pagination.page - 1)"
            />
            <span class="page-indicator">{{ pagination.page }} / {{ pagination.totalPages }}</span>
            <UButton
              icon="i-heroicons-chevron-right"
              size="xs"
              variant="ghost"
              :disabled="pagination.page >= pagination.totalPages"
              @click="goToPage(pagination.page + 1)"
            />
            <UButton
              icon="i-heroicons-chevron-double-right"
              size="xs"
              variant="ghost"
              :disabled="pagination.page >= pagination.totalPages"
              @click="goToPage(pagination.totalPages)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

const toast = useToast()

// State
const statistics = ref<any[]>([])
const totalSpend = ref(0)
const sourceBreakdown = ref<Array<{ source: string; spend: number }>>([])
const employees = ref<Array<{ id: number; name: string }>>([])
const isLoading = ref(false)
const period = ref('week')

// Pagination
const pagination = reactive({
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 1
})

const limitOptions = [
  { label: '10 записей', value: 10 },
  { label: '25 записей', value: 25 },
  { label: '50 записей', value: 50 },
  { label: '100 записей', value: 100 }
]

const paginationStart = computed(() => {
  if (pagination.total === 0) return 0
  return (pagination.page - 1) * pagination.limit + 1
})

const paginationEnd = computed(() => {
  return Math.min(pagination.page * pagination.limit, pagination.total)
})

const goToPage = (page: number) => {
  if (page < 1 || page > pagination.totalPages) return
  pagination.page = page
  fetchData()
}

const onLimitChange = () => {
  pagination.page = 1
  fetchData()
}

const filters = reactive({
  startDate: '',
  endDate: '',
  source: '',
  userId: '' as string | number
})

const periodOptions = [
  { label: 'Сегодня', value: 'today' },
  { label: 'Вчера', value: 'yesterday' },
  { label: '3 дня', value: '3days' },
  { label: 'Неделя', value: 'week' },
  { label: 'Текущий месяц', value: 'currentMonth' },
  { label: 'Предыдущий месяц', value: 'prevMonth' },
  { label: 'Весь период', value: 'all' },
  { label: 'Произвольный', value: 'custom' }
]

const sourceOptions = [
  { label: 'Все источники', value: '' },
  { label: 'Facebook', value: 'FACEBOOK' },
  { label: 'Google', value: 'GOOGLE' },
  { label: 'TikTok', value: 'TIKTOK' },
  { label: 'Telegram', value: 'TELEGRAM' }
]

const columns = [
  { key: 'date', label: 'Дата', sortable: true },
  { key: 'userName', label: 'Сотрудник', sortable: false },
  { key: 'source', label: 'Источник', sortable: true },
  { key: 'spend', label: 'Расходы', sortable: true }
]

function formatDate(dateStr: string) {
  return dateStr.split('T')[0].split('-').reverse().join('.')
}

function getSourceColor(source: string): 'blue' | 'red' | 'pink' | 'cyan' | 'gray' {
  const colors: Record<string, 'blue' | 'red' | 'pink' | 'cyan' | 'gray'> = {
    FACEBOOK: 'blue',
    GOOGLE: 'red',
    TIKTOK: 'pink',
    TELEGRAM: 'cyan'
  }
  return colors[source] || 'gray'
}

function applyPeriod() {
  const today = new Date()
  let startDate = new Date()
  let endDate = new Date()

  switch (period.value) {
    case 'today':
      filters.startDate = today.toISOString().split('T')[0]
      filters.endDate = today.toISOString().split('T')[0]
      break
    case 'yesterday':
      startDate.setDate(today.getDate() - 1)
      filters.startDate = startDate.toISOString().split('T')[0]
      filters.endDate = startDate.toISOString().split('T')[0]
      break
    case '3days':
      startDate.setDate(today.getDate() - 3)
      filters.startDate = startDate.toISOString().split('T')[0]
      filters.endDate = today.toISOString().split('T')[0]
      break
    case 'week':
      startDate.setDate(today.getDate() - 7)
      filters.startDate = startDate.toISOString().split('T')[0]
      filters.endDate = today.toISOString().split('T')[0]
      break
    case 'currentMonth':
      startDate.setDate(1)
      filters.startDate = startDate.toISOString().split('T')[0]
      filters.endDate = today.toISOString().split('T')[0]
      break
    case 'prevMonth':
      startDate.setMonth(today.getMonth() - 1)
      startDate.setDate(1)
      endDate.setDate(0)
      filters.startDate = startDate.toISOString().split('T')[0]
      filters.endDate = endDate.toISOString().split('T')[0]
      break
    case 'all':
      filters.startDate = '2020-01-01'
      filters.endDate = today.toISOString().split('T')[0]
      break
  }

  if (period.value !== 'custom') {
    fetchData()
  }
}

async function fetchData() {
  isLoading.value = true
  try {
    const params = new URLSearchParams()
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    if (filters.source) params.append('source', filters.source)
    if (filters.userId) params.append('userId', filters.userId.toString())
    params.append('page', pagination.page.toString())
    params.append('limit', pagination.limit.toString())

    const response = await $fetch<{
      statistics: any[]
      totalSpend: number
      sourceBreakdown: Array<{ source: string; spend: number }>
      users: Array<{ id: number; name: string }>
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>(`/api/finance?${params}`)

    statistics.value = response.statistics
    totalSpend.value = response.totalSpend
    sourceBreakdown.value = response.sourceBreakdown
    employees.value = response.users
    pagination.page = response.pagination.page
    pagination.total = response.pagination.total
    pagination.totalPages = response.pagination.totalPages
  } catch (error: any) {
    if (error.statusCode === 403) {
      toast.add({ title: 'Доступ запрещен', color: 'red' })
      await navigateTo('/login')
    } else {
      toast.add({ title: 'Ошибка загрузки', color: 'red' })
    }
  } finally {
    isLoading.value = false
  }
}

function resetFilters() {
  period.value = 'week'
  filters.source = ''
  filters.userId = ''
  pagination.page = 1
  applyPeriod()
}

onMounted(() => {
  applyPeriod()
})
</script>

<style scoped>
.finance-page {
  color: #e2e8f0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.page-title {
  font-size: 1.875rem;
  font-weight: 700;
  background: linear-gradient(135deg, #fff, #94a3b8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  color: #64748b;
  margin-top: 0.25rem;
}

.filters-card {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9));
  border: 1px solid rgba(71, 85, 105, 0.3);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  backdrop-filter: blur(10px);
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.filters-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
}

.totals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.source-breakdown {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.total-card {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9));
  border: 1px solid rgba(71, 85, 105, 0.3);
  border-radius: 0.75rem;
  padding: 1rem;
  text-align: center;
}

.total-card.spend {
  border-color: rgba(239, 68, 68, 0.3);
}

.total-label {
  display: block;
  color: #64748b;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.total-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #e2e8f0;
}

.table-card {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9));
  border: 1px solid rgba(71, 85, 105, 0.3);
  border-radius: 1rem;
  padding: 1.5rem;
  overflow-x: auto;
}

.pagination-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(71, 85, 105, 0.3);
}

.pagination-info {
  color: #64748b;
  font-size: 0.875rem;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.per-page-select {
  width: 140px;
}

.page-buttons {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.page-indicator {
  padding: 0 0.75rem;
  color: #e2e8f0;
  font-size: 0.875rem;
  font-weight: 500;
}
</style>
