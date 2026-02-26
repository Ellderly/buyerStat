<template>
  <div class="statistics-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Статистика</h1>
        <p class="page-subtitle">Ввод и редактирование данных</p>
      </div>
      <div class="header-actions">
        <UButton 
          icon="i-heroicons-plus" 
          @click="openAddModal"
          class="add-button"
        >
          Добавить запись
        </UButton>
      </div>
    </header>

    <!-- Filters -->
    <div class="filters-card">
      <div class="filters-grid">
        <UFormGroup label="Источник">
          <USelectMenu
            v-model="filters.source"
            :options="sourceOptions"
            placeholder="Все источники"
            option-attribute="label"
            value-attribute="value"
          />
        </UFormGroup>

        <UFormGroup label="ГЕО">
          <UInput
            v-model="filters.geo"
            placeholder="Введите ГЕО"
            icon="i-heroicons-globe-alt"
          />
        </UFormGroup>

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
          <UInput
            v-model="filters.startDate"
            type="date"
          />
        </UFormGroup>

        <UFormGroup v-if="period === 'custom'" label="Дата до">
          <UInput
            v-model="filters.endDate"
            type="date"
          />
        </UFormGroup>
      </div>

      <div class="filters-grid mt-4">
        <UFormGroup label="Сотрудник">
          <USelectMenu
            v-model="filters.userId"
            :options="[{ id: '', name: 'Все сотрудники' }, ...employees]"
            option-attribute="name"
            value-attribute="id"
            placeholder="Все сотрудники"
          />
        </UFormGroup>
      </div>

      <div class="filters-actions">
        <UButton variant="soft" @click="resetFilters">
          Сбросить
        </UButton>
        <UButton @click="fetchStatistics">
          Применить
        </UButton>
      </div>
    </div>

    <!-- Statistics Table -->
    <div class="table-card">
      <UTable
        :rows="statistics"
        :columns="columns"
        :loading="isLoading"
        :empty-state="{ icon: 'i-heroicons-circle-stack-20-solid', label: 'Нет данных. Добавьте первую запись!' }"
      >
        <template #date-data="{ row }">
          {{ formatDate(row.date) }}
        </template>

        <template #source-data="{ row }">
          <UBadge :color="getSourceColor(row.source)" variant="soft">
            {{ row.source }}
          </UBadge>
        </template>

        <template #userName-data="{ row }">
          <span class="text-gray-300">{{ row.user?.name || '-' }}</span>
        </template>

        <template #spend-data="{ row }">
          ${{ row.spend.toFixed(2) }}
        </template>

        <template #revenue-data="{ row }">
          ${{ row.revenue.toFixed(2) }}
        </template>

        <template #profit-data="{ row }">
          <span :class="(row.profit ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'">
            ${{ (row.profit ?? 0).toFixed(2) }}
          </span>
        </template>

        <template #roi-data="{ row }">
          <span :class="(row.roi ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'">
            {{ (row.roi ?? 0).toFixed(1) }}%
          </span>
        </template>

        <template #cr-data="{ row }">
          <span class="text-emerald-400">{{ (row.cr ?? 0).toFixed(1) }}%</span>
        </template>

        <template #cpl-data="{ row }">
          <span class="text-purple-400">${{ (row.cpl ?? 0).toFixed(2) }}</span>
        </template>

        <template #cpc-data="{ row }">
          <span v-if="row.cpc != null" class="text-cyan-400">
            ${{ row.cpc.toFixed(2) }}
          </span>
          <span v-else class="text-gray-600">-</span>
        </template>

        <template #cpa-data="{ row }">
          <span v-if="row.cpa != null" class="text-cyan-400">
            ${{ row.cpa.toFixed(2) }}
          </span>
          <span v-else class="text-gray-600">-</span>
        </template>

        <template #actions-data="{ row }">
          <div class="flex gap-2">
            <UButton
              icon="i-heroicons-pencil"
              size="xs"
              variant="ghost"
              @click="openEditModal(row)"
            />
            <UButton
              icon="i-heroicons-trash"
              size="xs"
              variant="ghost"
              color="red"
              @click="confirmDelete(row)"
            />
          </div>
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

    <!-- Add/Edit Modal -->
    <UModal v-model="isModalOpen">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">
            {{ editingId ? 'Редактировать запись' : 'Новая запись' }}
          </h3>
        </template>

        <form @submit.prevent="saveStatistic" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Дата" required>
              <UInput v-model="form.date" type="date" />
            </UFormGroup>

            <UFormGroup label="Источник" required>
              <USelectMenu
                v-model="form.source"
                :options="sourceOptions.filter(s => s.value)"
                option-attribute="label"
                value-attribute="value"
              />
            </UFormGroup>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="ГЕО" required>
              <USelectMenu
                v-model="form.geo"
                :options="geoOptions"
                option-attribute="label"
                value-attribute="value"
                placeholder="Выберите ГЕО"
              />
            </UFormGroup>

            <UFormGroup label="Оффер" required>
              <USelectMenu
                v-model="form.offer"
                :options="offerOptions"
                option-attribute="label"
                value-attribute="value"
                placeholder="Выберите оффер"
              />
            </UFormGroup>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Креатив" required>
              <UInput v-model="form.creative" placeholder="Название креатива" />
            </UFormGroup>

            <UFormGroup label="Лиды">
              <UInput v-model="form.leads" type="number" min="0" />
            </UFormGroup>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Расходы ($)">
              <UInput v-model="form.spend" type="number" step="0.01" min="0" />
            </UFormGroup>

            <UFormGroup label="FTD">
              <UInput v-model="form.ftd" type="number" min="0" />
            </UFormGroup>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Доход ($)">
              <UInput v-model="form.revenue" type="number" step="0.01" min="0" />
            </UFormGroup>
          </div>

          <!-- Telegram-specific fields -->
          <div v-if="form.source === 'TELEGRAM'" class="telegram-fields">
            <div class="telegram-header">
              <UIcon name="i-heroicons-paper-airplane" />
              <span>Telegram параметры</span>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <UFormGroup label="Кол. подписчиков">
                <UInput v-model="form.subscribers" type="number" min="0" placeholder="0" />
              </UFormGroup>
              <UFormGroup label="Кол. кликов">
                <UInput v-model="form.clicks" type="number" min="0" placeholder="0" />
              </UFormGroup>
            </div>
          </div>

          <!-- Calculated fields preview -->
          <div class="calculated-preview" :class="{ 'with-telegram': form.source === 'TELEGRAM' }">
            <div class="calc-item">
              <span class="calc-label">CPL:</span>
              <span class="calc-value">${{ calculatedCPL }}</span>
            </div>
            <div class="calc-item">
              <span class="calc-label">CR%:</span>
              <span class="calc-value">{{ calculatedCR }}%</span>
            </div>
            <div class="calc-item">
              <span class="calc-label">Прибыль:</span>
              <span class="calc-value" :class="parseFloat(calculatedProfit) >= 0 ? 'text-green-500' : 'text-red-500'">
                ${{ calculatedProfit }}
              </span>
            </div>
            <div class="calc-item">
              <span class="calc-label">ROI:</span>
              <span class="calc-value" :class="parseFloat(calculatedROI) >= 0 ? 'text-green-500' : 'text-red-500'">
                {{ calculatedROI }}%
              </span>
            </div>
            <!-- Telegram-specific calculated metrics -->
            <div v-if="form.source === 'TELEGRAM'" class="calc-item telegram-metric">
              <span class="calc-label">CPC:</span>
              <span class="calc-value text-cyan-400">${{ calculatedCPC }}</span>
            </div>
            <div v-if="form.source === 'TELEGRAM'" class="calc-item telegram-metric">
              <span class="calc-label">CPA:</span>
              <span class="calc-value text-cyan-400">${{ calculatedCPA }}</span>
            </div>
          </div>
        </form>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton variant="ghost" @click="isModalOpen = false">
              Отмена
            </UButton>
            <UButton @click="saveStatistic" :loading="isSaving">
              {{ editingId ? 'Сохранить' : 'Добавить' }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Delete Confirmation -->
    <UModal v-model="isDeleteModalOpen">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-red-500">Удалить запись?</h3>
        </template>
        <p class="text-gray-400">
          Вы уверены, что хотите удалить эту запись? Это действие нельзя отменить.
        </p>
        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton variant="ghost" @click="isDeleteModalOpen = false">
              Отмена
            </UButton>
            <UButton color="red" @click="deleteStatistic" :loading="isDeleting">
              Удалить
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

interface Statistic {
  id: number
  date: string
  source: string
  geo: string
  offer: string
  creative: string
  leads: number
  spend: number
  ftd: number
  revenue: number
  // Telegram-specific
  subscribers?: number
  clicks?: number
  user?: { name: string; username: string }
  // Computed fields for sorting
  profit?: number
  roi?: number
  cr?: number
  cpl?: number
  cpc?: number
  cpa?: number
}

const toast = useToast()

// State
const statistics = ref<Statistic[]>([])
const isLoading = ref(false)
const isModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const editingId = ref<number | null>(null)
const deletingId = ref<number | null>(null)
const userTeams = ref<Array<{ id: number; name: string }>>([])

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
  fetchStatistics()
}

const onLimitChange = () => {
  pagination.page = 1
  fetchStatistics()
}
const selectedTeamFilter = ref<number | undefined>(undefined)

const period = ref('all')
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
      filters.startDate = ''
      filters.endDate = ''
      break
  }

  if (period.value !== 'custom') {
    pagination.page = 1
    fetchStatistics()
  }
}

// Filters
const filters = reactive({
  source: '',
  geo: '',
  startDate: '',
  endDate: '',
  userId: '' as string | number
})

// Employees list for filter
const employees = ref<Array<{ id: number; name: string; username: string }>>([]);

// User role
const userRole = ref('');

// Form
const form = reactive({
  date: new Date().toISOString().split('T')[0],
  source: 'FACEBOOK',
  geo: '',
  offer: '',
  creative: '',
  leads: 0,
  spend: 0,
  ftd: 0,
  revenue: 0,
  // Telegram-specific fields
  subscribers: 0,
  clicks: 0
})


// Options
const sourceOptions = [
  { label: 'Все источники', value: '' },
  { label: 'Facebook', value: 'FACEBOOK' },
  { label: 'Google', value: 'GOOGLE' },
  { label: 'TikTok', value: 'TIKTOK' },
  { label: 'Telegram', value: 'TELEGRAM' }
]

const geoOptions = ref<Array<{ label: string; value: string }>>([])

const fetchGeos = async () => {
  try {
    const response = await $fetch<{ geos: Array<{ name: string; code: string }> }>('/api/geos')
    geoOptions.value = response.geos.map(g => ({ label: g.name, value: g.name }))
  } catch (error) {
    console.error('Failed to fetch geos')
    geoOptions.value = []
  }
}

const offerOptions = ref<Array<{ label: string; value: string }>>([])

const fetchOffers = async () => {
  try {
    const response = await $fetch<{ offers: Array<{ name: string; value: string }> }>('/api/offers')
    offerOptions.value = response.offers.map(o => ({ label: o.name, value: o.value }))
  } catch (error) {
    console.error('Failed to fetch offers')
    // Fallback to empty - offers will be loaded from DB
    offerOptions.value = []
  }
}

// Table columns
const columns = [
  { key: 'date', label: 'Дата', sortable: true },
  { key: 'userName', label: 'Сотрудник' },
  { key: 'source', label: 'Источник', sortable: true },
  { key: 'geo', label: 'ГЕО', sortable: true },
  { key: 'offer', label: 'Оффер', sortable: true },
  { key: 'creative', label: 'Креатив', sortable: true },
  { key: 'leads', label: 'Лиды', sortable: true },
  { key: 'cpl', label: 'CPL', sortable: true },
  { key: 'spend', label: 'Расходы', sortable: true },
  { key: 'ftd', label: 'FTD', sortable: true },
  { key: 'revenue', label: 'Доход', sortable: true },
  { key: 'profit', label: 'Прибыль', sortable: true },
  { key: 'roi', label: 'ROI', sortable: true },
  { key: 'cr', label: 'CR%', sortable: true },
  { key: 'cpc', label: 'CPC', sortable: true },
  { key: 'cpa', label: 'CPA', sortable: true },
  { key: 'actions', label: '' }
]

// Computed calculations for form
const calculatedCPL = computed(() => {
  if (form.leads === 0) return '0.00'
  return (form.spend / form.leads).toFixed(2)
})

const calculatedCR = computed(() => {
  if (form.leads === 0) return '0.0'
  return ((form.ftd / form.leads) * 100).toFixed(1)
})

const calculatedProfit = computed(() => {
  return (form.revenue - form.spend).toFixed(2)
})

const calculatedROI = computed(() => {
  if (form.spend === 0) return '0.0'
  return (((form.revenue - form.spend) / form.spend) * 100).toFixed(1)
})

// Telegram-specific calculated metrics
const calculatedCPC = computed(() => {
  if (form.clicks === 0) return '0.00'
  return (form.spend / form.clicks).toFixed(2)
})

const calculatedCPA = computed(() => {
  if (form.subscribers === 0) return '0.00'
  return (form.spend / form.subscribers).toFixed(2)
})

// Methods
const getProfit = (row: Statistic) => row.revenue - row.spend

const getRoi = (row: Statistic) => {
  if (row.spend === 0) return 0
  return ((row.revenue - row.spend) / row.spend) * 100
}

const getCr = (row: Statistic) => {
  if (row.leads === 0) return 0
  return (row.ftd / row.leads) * 100
}

const getCpl = (row: Statistic) => {
  if (row.leads === 0) return 0
  return row.spend / row.leads
}

// Telegram-specific metrics
const getCpc = (row: Statistic): number | null => {
  if (row.source !== 'TELEGRAM' || !row.clicks || row.clicks === 0) return null
  return row.spend / row.clicks
}

const getCpa = (row: Statistic): number | null => {
  if (row.source !== 'TELEGRAM' || !row.subscribers || row.subscribers === 0) return null
  return row.spend / row.subscribers
}

const formatDate = (dateStr: string) => {
  return dateStr.split('T')[0].split('-').reverse().join('.')
}

const getSourceColor = (source: string): 'blue' | 'red' | 'pink' | 'cyan' | 'gray' => {
  const colors: Record<string, 'blue' | 'red' | 'pink' | 'cyan' | 'gray'> = {
    FACEBOOK: 'blue',
    GOOGLE: 'red',
    TIKTOK: 'pink',
    TELEGRAM: 'cyan'
  }
  return colors[source] || 'gray'
}

const fetchUserTeams = async () => {
  try {
    const data = await $fetch<{ user: any }>('/api/auth/me')
    const user = data.user

    if (!user) return

    userRole.value = user.role

    if (user.role === 'ADMIN') {
      const { teams } = await $fetch('/api/teams')
      userTeams.value = teams
    } else if (user.teamId) {
      userTeams.value = [{ 
        id: user.teamId, 
        name: user.teamName || `Team #${user.teamId}` 
      }]
    }
  } catch (error) {
    console.error('Failed to fetch user teams')
  }
}

const fetchStatistics = async () => {
  isLoading.value = true
  try {
    const params = new URLSearchParams()
    if (filters.source) params.append('source', filters.source)
    if (filters.geo) params.append('geo', filters.geo)
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    if (filters.userId) params.append('userId', filters.userId.toString())
    
    // Pagination params
    params.append('page', pagination.page.toString())
    params.append('limit', pagination.limit.toString())

    const response = await $fetch<{ 
      statistics: Statistic[]
      pagination: { page: number; limit: number; total: number; totalPages: number } 
    }>(`/api/statistics?${params}`)
    
    // Add computed fields for sorting
    statistics.value = response.statistics.map(row => ({
      ...row,
      profit: row.revenue - row.spend,
      roi: row.spend > 0 ? ((row.revenue - row.spend) / row.spend) * 100 : 0,
      cr: row.leads > 0 ? (row.ftd / row.leads) * 100 : 0,
      cpl: row.leads > 0 ? row.spend / row.leads : 0,
      cpc: row.source === 'TELEGRAM' && row.clicks && row.clicks > 0 ? row.spend / row.clicks : undefined,
      cpa: row.source === 'TELEGRAM' && row.subscribers && row.subscribers > 0 ? row.spend / row.subscribers : undefined
    }))
    
    pagination.page = response.pagination.page
    pagination.total = response.pagination.total
    pagination.totalPages = response.pagination.totalPages
  } catch (error) {
    toast.add({ title: 'Ошибка загрузки данных', color: 'red' })
  } finally {
    isLoading.value = false
  }
}

const resetFilters = () => {
  filters.source = ''
  filters.geo = ''
  filters.startDate = ''
  filters.endDate = ''
  filters.userId = ''
  pagination.page = 1
  fetchStatistics()
}

const fetchEmployees = async () => {
  try {
    // TEAMLEAD gets only their team members
    const url = userRole.value === 'TEAMLEAD' ? '/api/users?teamOnly=true' : '/api/users'
    const { users } = await $fetch<{ users: Array<{ id: number; name: string; username: string }> }>(url)
    employees.value = users
  } catch (error) {
    console.error('Failed to fetch employees')
  }
}

const resetForm = () => {
  form.date = new Date().toISOString().split('T')[0]
  form.source = 'FACEBOOK'
  form.geo = ''
  form.offer = ''
  form.creative = ''
  form.leads = 0
  form.spend = 0
  form.ftd = 0
  form.revenue = 0
  // Reset Telegram fields
  form.subscribers = 0
  form.clicks = 0
}

const openAddModal = () => {
  editingId.value = null
  resetForm()
  isModalOpen.value = true
}

const openEditModal = (row: Statistic) => {
  editingId.value = row.id
  form.date = row.date.split('T')[0]
  form.source = row.source
  form.geo = row.geo
  form.offer = row.offer
  form.creative = row.creative
  form.leads = row.leads
  form.spend = row.spend
  form.ftd = row.ftd
  form.revenue = row.revenue
  // Telegram fields
  form.subscribers = row.subscribers || 0
  form.clicks = row.clicks || 0
  isModalOpen.value = true
}

const saveStatistic = async () => {
  isSaving.value = true
  try {
    if (editingId.value) {
      await $fetch(`/api/statistics/${editingId.value}`, {
        method: 'PUT',
        body: form
      })
      toast.add({ title: 'Запись обновлена', color: 'green' })
    } else {
      await $fetch('/api/statistics', {
        method: 'POST',
        body: form
      })
      toast.add({ title: 'Запись добавлена', color: 'green' })
    }
    isModalOpen.value = false
    fetchStatistics()
  } catch (error: any) {
    toast.add({ title: error.data?.message || 'Ошибка сохранения', color: 'red' })
  } finally {
    isSaving.value = false
  }
}

const confirmDelete = (row: Statistic) => {
  deletingId.value = row.id
  isDeleteModalOpen.value = true
}

const deleteStatistic = async () => {
  if (!deletingId.value) return
  isDeleting.value = true
  try {
    await $fetch(`/api/statistics/${deletingId.value}`, {
      method: 'DELETE'
    })
    toast.add({ title: 'Запись удалена', color: 'green' })
    isDeleteModalOpen.value = false
    fetchStatistics()
  } catch (error: any) {
    toast.add({ title: error.data?.message || 'Ошибка удаления', color: 'red' })
  } finally {
    isDeleting.value = false
  }
}

// Load on mount
onMounted(async () => {
  await fetchUserTeams()
  fetchOffers()
  fetchGeos()
  fetchEmployees()
  fetchStatistics()
})
</script>

<style scoped>
.statistics-page {
  color: #e2e8f0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
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

.add-button {
  background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
}

.filters-card {
  background: rgba(15, 15, 35, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.filters-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.table-card {
  background: rgba(15, 15, 35, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  padding: 1.5rem;
  overflow-x: auto;
}

.calculated-preview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  padding: 1rem;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 0.5rem;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.calc-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.calc-label {
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 0.25rem;
}

.calc-value {
  font-size: 1.125rem;
  font-weight: 600;
}

/* Telegram-specific fields styling */
.telegram-fields {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(6, 182, 212, 0.1);
  border: 1px solid rgba(6, 182, 212, 0.3);
  border-radius: 0.75rem;
}

.telegram-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #22d3ee;
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.calculated-preview.with-telegram {
  grid-template-columns: repeat(3, 1fr);
}

.telegram-metric {
  background: rgba(6, 182, 212, 0.15);
  border-radius: 0.5rem;
  padding: 0.5rem;
}

/* Pagination styles */
.pagination-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
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

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .add-button {
    width: 100%;
    justify-content: center;
  }

  .filters-card {
    padding: 1rem;
  }
  
  .filters-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .filters-actions {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .filters-actions button {
    width: 100%;
    justify-content: center;
  }
  
  .table-card {
    padding: 0.75rem;
    margin-left: -1rem;
    margin-right: -1rem;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }
  
  .table-card :deep(table) {
    font-size: 0.75rem;
  }
  
  .table-card :deep(th),
  .table-card :deep(td) {
    padding: 0.5rem 0.375rem;
    white-space: nowrap;
  }

  .calculated-preview {
    grid-template-columns: repeat(2, 1fr);
    padding: 0.75rem;
    gap: 0.75rem;
  }
  
  .calc-value {
    font-size: 1rem;
  }
  
  .page-title {
    font-size: 1.5rem;
  }
  
  .page-subtitle {
    font-size: 0.875rem;
  }

  .pagination-wrapper {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .pagination-info {
    text-align: center;
  }

  .pagination-controls {
    justify-content: space-between;
  }

  .per-page-select {
    width: 120px;
  }
}

@media (max-width: 480px) {
  .statistics-page :deep(.grid-cols-2) {
    grid-template-columns: 1fr !important;
  }
}
</style>
