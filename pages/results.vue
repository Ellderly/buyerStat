<template>
  <div class="results-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Результаты</h1>
        <p class="page-subtitle">Агрегированные отчеты и аналитика</p>
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
        <UFormGroup label="Группировка">
          <USelectMenu
            v-model="groupBy"
            :options="groupByOptions"
            option-attribute="label"
            value-attribute="value"
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

        <UFormGroup label="Дата от">
          <UInput v-model="filters.startDate" type="date" />
        </UFormGroup>

        <UFormGroup label="Дата до">
          <UInput v-model="filters.endDate" type="date" />
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
        <span class="total-label">Revenue</span>
        <span class="total-value">${{ totals.revenue.toFixed(2) }}</span>
      </div>
      <div class="total-card profit">
        <span class="total-label">Profit</span>
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
        <template #key-data="{ row }">
          <span class="font-medium">{{ formatKey(row.key) }}</span>
        </template>

        <template #spend-data="{ row }">
          ${{ row.spend.toFixed(2) }}
        </template>

        <template #revenue-data="{ row }">
          ${{ row.revenue.toFixed(2) }}
        </template>

        <template #cpl-data="{ row }">
          ${{ row.cpl.toFixed(2) }}
        </template>

        <template #cr-data="{ row }">
          {{ row.cr.toFixed(1) }}%
        </template>

        <template #profit-data="{ row }">
          <span :class="row.profit >= 0 ? 'text-green-500' : 'text-red-500'">
            ${{ row.profit.toFixed(2) }}
          </span>
        </template>

        <template #roi-data="{ row }">
          <div class="flex items-center gap-2">
            <span :class="row.roi >= 0 ? 'text-green-500' : 'text-red-500'">
              {{ row.roi.toFixed(1) }}%
            </span>
            <div class="roi-indicator" :class="getRoiClass(row.roi)"></div>
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

interface ResultRow {
  key: string
  leads: number
  spend: number
  ftd: number
  revenue: number
  profit: number
  roi: number
  cpl: number
  cr: number
  count: number
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
const results = ref<ResultRow[]>([])
const totals = ref<Totals>({
  leads: 0, spend: 0, ftd: 0, revenue: 0, profit: 0, roi: 0, cpl: 0, cr: 0
})
const isLoading = ref(false)
const groupBy = ref('date')
const period = ref('week')

const filters = reactive({
  startDate: '',
  endDate: ''
})

// Options
const groupByOptions = [
  { label: 'По дате', value: 'date' },
  { label: 'По офферу', value: 'offer' },
  { label: 'По креативу', value: 'creative' },
  { label: 'По ГЕО', value: 'geo' },
  { label: 'По источнику', value: 'source' }
]

const periodOptions = [
  { label: 'Вчера', value: 'yesterday' },
  { label: '3 дня', value: '3days' },
  { label: 'Неделя', value: 'week' },
  { label: 'Месяц', value: 'month' },
  { label: 'Произвольный', value: 'custom' }
]

// Table columns
const columns = computed(() => [
  { key: 'key', label: getGroupLabel() },
  { key: 'leads', label: 'Лиды' },
  { key: 'ftd', label: 'FTD' },
  { key: 'spend', label: 'Расходы' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'cpl', label: 'CPL' },
  { key: 'cr', label: 'CR%' },
  { key: 'profit', label: 'Profit' },
  { key: 'roi', label: 'ROI' }
])

function getGroupLabel() {
  const labels: Record<string, string> = {
    date: 'Дата',
    offer: 'Оффер',
    creative: 'Креатив',
    geo: 'ГЕО',
    source: 'Источник'
  }
  return labels[groupBy.value] || 'Группа'
}

function formatKey(key: string) {
  if (groupBy.value === 'date') {
    return new Date(key).toLocaleDateString('ru-RU')
  }
  return key
}

function getRoiClass(roi: number) {
  if (roi < 0) return 'roi-negative'
  if (roi < 30) return 'roi-neutral'
  return 'roi-positive'
}

function applyPeriod() {
  const today = new Date()
  let startDate = new Date()
  
  switch (period.value) {
    case 'yesterday':
      startDate.setDate(today.getDate() - 1)
      filters.endDate = startDate.toISOString().split('T')[0]
      filters.startDate = filters.endDate
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
    case 'month':
      startDate.setMonth(today.getMonth() - 1)
      filters.startDate = startDate.toISOString().split('T')[0]
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
    params.append('groupBy', groupBy.value)
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)

    const response = await $fetch(`/api/results?${params}`)
    results.value = response.results
    totals.value = response.totals
  } catch (error) {
    toast.add({ title: 'Ошибка загрузки', color: 'red' })
  } finally {
    isLoading.value = false
  }
}

function resetFilters() {
  groupBy.value = 'date'
  period.value = 'week'
  applyPeriod()
}

function exportCSV() {
  if (results.value.length === 0) {
    toast.add({ title: 'Нет данных для экспорта', color: 'yellow' })
    return
  }

  const headers = ['Группа', 'Лиды', 'FTD', 'Расходы', 'Revenue', 'CPL', 'CR%', 'Profit', 'ROI']
  const rows = results.value.map(r => [
    r.key,
    r.leads,
    r.ftd,
    r.spend.toFixed(2),
    r.revenue.toFixed(2),
    r.cpl.toFixed(2),
    r.cr.toFixed(1),
    r.profit.toFixed(2),
    r.roi.toFixed(1)
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
onMounted(() => {
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

.filters-card {
  background: rgba(15, 15, 35, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.filters-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.totals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.total-card {
  background: rgba(15, 15, 35, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.75rem;
  padding: 1.25rem;
  text-align: center;
}

.total-card.profit {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05));
  border-color: rgba(34, 197, 94, 0.2);
}

.total-card.roi {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(99, 102, 241, 0.05));
  border-color: rgba(99, 102, 241, 0.2);
}

.total-label {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.total-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.total-value.positive { color: #22c55e; }
.total-value.negative { color: #ef4444; }

.table-card {
  background: rgba(15, 15, 35, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  padding: 1.5rem;
  overflow-x: auto;
}

.roi-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.roi-indicator.roi-positive { background: #22c55e; }
.roi-indicator.roi-neutral { background: #f59e0b; }
.roi-indicator.roi-negative { background: #ef4444; }

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .totals-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
