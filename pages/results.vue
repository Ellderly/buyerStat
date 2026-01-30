<template>
  <div class="results-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Результаты</h1>
        <p class="page-subtitle">Детальный отчет по всем записям</p>
      </div>
      <div class="header-actions">
        <UButton 
          icon="i-heroicons-arrow-down-tray" 
          variant="soft"
          @click="exportCSV"
        >
          Экспорт CSV
        </UButton>
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

        <UFormGroup label="Дата от">
          <UInput v-model="filters.startDate" type="date" />
        </UFormGroup>

        <UFormGroup label="Дата до">
          <UInput v-model="filters.endDate" type="date" />
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

      <div class="filters-grid mt-4">
        <UFormGroup label="ГЕО">
          <USelectMenu
            v-model="filters.geo"
            :options="geoOptions"
            option-attribute="label"
            value-attribute="value"
            placeholder="Все ГЕО"
          />
        </UFormGroup>

        <UFormGroup label="Оффер">
          <USelectMenu
            v-model="filters.offer"
            :options="offerOptions"
            option-attribute="label"
            value-attribute="value"
            placeholder="Все офферы"
          />
        </UFormGroup>

        <UFormGroup label="Креатив">
          <UInput
            v-model="filters.creative"
            placeholder="Поиск по названию..."
            icon="i-heroicons-magnifying-glass"
          />
        </UFormGroup>

        <UFormGroup v-if="userRole === 'ADMIN' || userRole === 'TEAMLEAD'" label="Сотрудник">
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
        <UButton variant="soft" @click="resetFilters">Сбросить</UButton>
        <UButton @click="fetchResults">Применить</UButton>
      </div>
    </div>

    <!-- Totals Cards -->
    <div class="totals-grid">
      <div class="total-card">
        <span class="total-label">Лиды</span>
        <span class="total-value">{{ totals.leads.toLocaleString() }}</span>
      </div>
      <div class="total-card">
        <span class="total-label">FTD</span>
        <span class="total-value">{{ totals.ftd.toLocaleString() }}</span>
      </div>
      <div class="total-card">
        <span class="total-label">CR%</span>
        <span class="total-value text-emerald-400">{{ totals.cr.toFixed(1) }}%</span>
      </div>
      <div class="total-card">
        <span class="total-label">Расходы</span>
        <span class="total-value">${{ totals.spend.toFixed(2) }}</span>
      </div>
      <div class="total-card">
        <span class="total-label">Доход</span>
        <span class="total-value">${{ totals.revenue.toFixed(2) }}</span>
      </div>
      <div class="total-card profit">
        <span class="total-label">Прибыль</span>
        <span class="total-value" :class="totals.profit >= 0 ? 'positive' : 'negative'">
          ${{ totals.profit.toFixed(2) }}
        </span>
      </div>
      <div class="total-card roi">
        <span class="total-label">ROI</span>
        <span class="total-value" :class="totals.roi >= 0 ? 'positive' : 'negative'">
          {{ totals.roi.toFixed(1) }}%
        </span>
      </div>
      <div class="total-card cpl">
        <span class="total-label">CPL</span>
        <span class="total-value">${{ totals.cpl.toFixed(2) }}</span>
      </div>
    </div>

    <!-- Results Table -->
    <div class="table-card">
      <UTable
        :rows="results"
        :columns="columns"
        :loading="isLoading"
        :empty-state="{ icon: 'i-heroicons-circle-stack-20-solid', label: 'Нет данных за выбранный период' }"
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

        <template #cpl-data="{ row }">
          ${{ getCPL(row).toFixed(2) }}
        </template>

        <template #cr-data="{ row }">
          {{ (row.cr ?? 0).toFixed(1) }}%
        </template>

        <template #profit-data="{ row }">
          <span :class="(row.profit ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'">
            ${{ (row.profit ?? 0).toFixed(2) }}
          </span>
        </template>

        <template #roi-data="{ row }">
          <div class="flex items-center gap-2">
            <span :class="(row.roi ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'">
              {{ (row.roi ?? 0).toFixed(1) }}%
            </span>
            <div class="roi-indicator" :class="getRoiClass(row.roi ?? 0)"></div>
          </div>
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

interface Totals {
  leads: number
  spend: number
  ftd: number
  revenue: number
  profit: number
  roi: number
  cpl: number
  cr: number
}

const toast = useToast()

// State
const results = ref<Statistic[]>([])
const totals = ref<Totals>({
  leads: 0, spend: 0, ftd: 0, revenue: 0, profit: 0, roi: 0, cpl: 0, cr: 0
})
const isLoading = ref(false)
const period = ref('week')
const userRole = ref('')
const employees = ref<Array<{ id: number; name: string }>>([])
const offerOptions = ref<Array<{ label: string; value: string }>>([])

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
  fetchResults()
}

const onLimitChange = () => {
  pagination.page = 1
  fetchResults()
}

const filters = reactive({
  startDate: '',
  endDate: '',
  source: '',
  geo: '',
  offer: '',
  creative: '',
  userId: '' as string | number
})

// Options
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

const geoOptions = [
  { label: 'Все ГЕО', value: '' },
  { label: 'RuEU full pull', value: 'RuEU full pull' },
  { label: 'RuEU short pull', value: 'RuEU short pull' },
  { label: 'RuTR', value: 'RuTR' },
  { label: 'RuDE', value: 'RuDE' },
  { label: 'RuES', value: 'RuES' },
  { label: 'Ru Prubaltu', value: 'Ru Prubaltu' }
]

// Table columns - show userName only for admin/teamlead
const columns = computed(() => {
  const base = [
    { key: 'date', label: 'Дата', sortable: true },
    { key: 'source', label: 'Источник', sortable: true },
  ]
  
  if (userRole.value === 'ADMIN' || userRole.value === 'TEAMLEAD') {
    base.push({ key: 'userName', label: 'Сотрудник', sortable: false })
  }

  return [
    ...base,
    { key: 'geo', label: 'ГЕО', sortable: true },
    { key: 'offer', label: 'Оффер', sortable: true },
    { key: 'creative', label: 'Креатив', sortable: true },
    { key: 'leads', label: 'Лиды', sortable: true },
    { key: 'cpl', label: 'CPL', sortable: true },
    { key: 'spend', label: 'Расход', sortable: true },
    { key: 'ftd', label: 'FTD', sortable: true },
    { key: 'revenue', label: 'Доход', sortable: true },
    { key: 'profit', label: 'Прибыль', sortable: true },
    { key: 'roi', label: 'ROI', sortable: true },
    { key: 'cr', label: 'CR%', sortable: true },
    { key: 'cpc', label: 'CPC', sortable: true },
    { key: 'cpa', label: 'CPA', sortable: true }
  ]
})

// Computed metrics
function getProfit(row: Statistic) {
  return row.revenue - row.spend
}

function getROI(row: Statistic) {
  return row.spend > 0 ? ((row.revenue - row.spend) / row.spend) * 100 : 0
}

function getCPL(row: Statistic) {
  return row.leads > 0 ? row.spend / row.leads : 0
}

function getCR(row: Statistic) {
  return row.leads > 0 ? (row.ftd / row.leads) * 100 : 0
}

// Telegram-specific metrics
function getCPC(row: Statistic) {
  if (row.source !== 'TELEGRAM' || !row.clicks || row.clicks === 0) return null
  return row.spend / row.clicks
}

function getCPA(row: Statistic) {
  if (row.source !== 'TELEGRAM' || !row.subscribers || row.subscribers === 0) return null
  return row.spend / row.subscribers
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ru-RU')
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

function getRoiClass(roi: number) {
  if (roi < 0) return 'roi-negative'
  if (roi < 30) return 'roi-neutral'
  return 'roi-positive'
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
      endDate.setDate(0) // Last day of previous month
      filters.startDate = startDate.toISOString().split('T')[0]
      filters.endDate = endDate.toISOString().split('T')[0]
      break
    case 'all':
      filters.startDate = '2020-01-01'
      filters.endDate = today.toISOString().split('T')[0]
      break
  }
  
  if (period.value !== 'custom') {
    fetchResults()
  }
}

async function fetchResults() {
  isLoading.value = true
  try {
    const params = new URLSearchParams()
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    if (filters.source) params.append('source', filters.source)
    if (filters.geo) params.append('geo', filters.geo)
    if (filters.offer) params.append('offer', filters.offer)
    if (filters.creative) params.append('creative', filters.creative)
    if (filters.userId) params.append('userId', filters.userId.toString())
    
    // Pagination params
    params.append('page', pagination.page.toString())
    params.append('limit', pagination.limit.toString())

    const response = await $fetch<{ 
      statistics: Statistic[]
      pagination: { page: number; limit: number; total: number; totalPages: number }
      totals: { leads: number; spend: number; ftd: number; revenue: number; profit: number; roi: number; cpl: number; cr: number }
    }>(`/api/statistics?${params}`)
    
    // Add computed fields for sorting
    results.value = response.statistics.map(row => ({
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

    // Use totals from API (calculated for ALL matching records)
    totals.value = response.totals
  } catch (error) {
    toast.add({ title: 'Ошибка загрузки', color: 'red' })
  } finally {
    isLoading.value = false
  }
}

function resetFilters() {
  period.value = 'week'
  filters.source = ''
  filters.geo = ''
  filters.offer = ''
  filters.creative = ''
  filters.userId = ''
  pagination.page = 1
  applyPeriod()
}

async function fetchUserRole() {
  try {
    const { user } = await $fetch<{ user: { role: string } }>('/api/auth/me')
    userRole.value = user.role
  } catch (error) {
    console.error('Failed to fetch user role')
  }
}

async function fetchEmployees() {
  try {
    // TEAMLEAD gets only their team members
    const url = userRole.value === 'TEAMLEAD' ? '/api/users?teamOnly=true' : '/api/users'
    const { users } = await $fetch<{ users: Array<{ id: number; name: string }> }>(url)
    employees.value = users
  } catch (error) {
    console.error('Failed to fetch employees')
  }
}

async function fetchOffers() {
  try {
    const { offers } = await $fetch<{ offers: Array<{ name: string; value: string }> }>('/api/offers')
    offerOptions.value = [
      { label: 'Все офферы', value: '' },
      ...offers.map(o => ({ label: o.name, value: o.value }))
    ]
  } catch (error) {
    console.error('Failed to fetch offers')
  }
}

function exportCSV() {
  if (results.value.length === 0) {
    toast.add({ title: 'Нет данных для экспорта', color: 'yellow' })
    return
  }

  const headers = ['Дата', 'Источник', 'Сотрудник', 'ГЕО', 'Оффер', 'Креатив', 'Лиды', 'Расход', 'FTD', 'Доход', 'Прибыль', 'ROI']
  const rows = results.value.map(r => [
    formatDate(r.date),
    r.source,
    r.user?.name || '-',
    r.geo,
    r.offer,
    r.creative,
    r.leads,
    r.spend.toFixed(2),
    r.ftd,
    r.revenue.toFixed(2),
    getProfit(r).toFixed(2),
    getROI(r).toFixed(1) + '%'
  ])

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `results_${new Date().toISOString().split('T')[0]}.csv`)
  link.click()
  
  toast.add({ title: 'CSV экспортирован', color: 'green' })
}

// Initialize
onMounted(async () => {
  await fetchUserRole()
  if (userRole.value === 'ADMIN' || userRole.value === 'TEAMLEAD') {
    await fetchEmployees()
  }
  await fetchOffers()
  applyPeriod()
})
</script>

<style scoped>
.results-page {
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
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
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

.total-value.positive {
  color: #22c55e;
}

.total-value.negative {
  color: #ef4444;
}

.table-card {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9));
  border: 1px solid rgba(71, 85, 105, 0.3);
  border-radius: 1rem;
  padding: 1.5rem;
  overflow-x: auto;
}

.roi-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.roi-positive {
  background: #22c55e;
}

.roi-neutral {
  background: #eab308;
}

.roi-negative {
  background: #ef4444;
}

/* Pagination styles */
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

@media (max-width: 768px) {
  .filters-grid {
    grid-template-columns: 1fr;
  }

  .totals-grid {
    grid-template-columns: repeat(2, 1fr);
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
</style>
