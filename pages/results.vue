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
          {{ getCR(row).toFixed(1) }}%
        </template>

        <template #profit-data="{ row }">
          <span :class="getProfit(row) >= 0 ? 'text-green-500' : 'text-red-500'">
            ${{ getProfit(row).toFixed(2) }}
          </span>
        </template>

        <template #roi-data="{ row }">
          <div class="flex items-center gap-2">
            <span :class="getROI(row) >= 0 ? 'text-green-500' : 'text-red-500'">
              {{ getROI(row).toFixed(1) }}%
            </span>
            <div class="roi-indicator" :class="getRoiClass(getROI(row))"></div>
          </div>
        </template>
      </UTable>
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
  user?: { name: string; username: string }
}

interface Totals {
  leads: number
  spend: number
  ftd: number
  revenue: number
  profit: number
  roi: number
}

const toast = useToast()

// State
const results = ref<Statistic[]>([])
const totals = ref<Totals>({
  leads: 0, spend: 0, ftd: 0, revenue: 0, profit: 0, roi: 0
})
const isLoading = ref(false)
const period = ref('week')
const userRole = ref('')
const employees = ref<Array<{ id: number; name: string }>>([])
const offerOptions = ref<Array<{ label: string; value: string }>>([])

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
    { key: 'spend', label: 'Расход', sortable: true },
    { key: 'ftd', label: 'FTD', sortable: true },
    { key: 'revenue', label: 'Доход', sortable: true },
    { key: 'profit', label: 'Прибыль', sortable: true },
    { key: 'roi', label: 'ROI', sortable: true },
    { key: 'cr', label: 'CR%', sortable: true }
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

    const response = await $fetch<{ statistics: Statistic[] }>(`/api/statistics?${params}`)
    results.value = response.statistics

    // Calculate totals
    const t = { leads: 0, spend: 0, ftd: 0, revenue: 0, profit: 0, roi: 0 }
    for (const r of response.statistics) {
      t.leads += r.leads
      t.spend += r.spend
      t.ftd += r.ftd
      t.revenue += r.revenue
    }
    t.profit = t.revenue - t.spend
    t.roi = t.spend > 0 ? ((t.revenue - t.spend) / t.spend) * 100 : 0
    totals.value = t
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
    const { users } = await $fetch<{ users: Array<{ id: number; name: string }> }>('/api/users')
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

@media (max-width: 768px) {
  .filters-grid {
    grid-template-columns: 1fr;
  }

  .totals-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
