<template>
  <div class="dashboard">
    <header class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Обзор ключевых показателей</p>
      </div>
      <div class="header-actions">
        <USelectMenu
          v-if="userRole === 'TEAMLEAD' && userTeams.length > 1"
          v-model="selectedTeam"
          :options="[{ id: null, name: 'Все команды' }, ...userTeams]"
          option-attribute="name"
          value-attribute="id"
          placeholder="Выберите команду"
          @change="fetchDashboard"
        />
        <USelectMenu
          v-model="selectedPeriod"
          :options="periodOptions"
          option-attribute="label"
          value-attribute="value"
          @change="fetchDashboard"
        />
      </div>
    </header>

    <!-- KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi-card profit">
        <div class="kpi-icon">
          <UIcon name="i-heroicons-currency-dollar" />
        </div>
        <div class="kpi-content">
          <span class="kpi-label">Profit</span>
          <span class="kpi-value">${{ formatNumber(kpis.profit.value) }}</span>
          <span class="kpi-change" :class="getChangeClass(kpis.profit.change)">
            <UIcon :name="getChangeIcon(kpis.profit.change)" />
            {{ Math.abs(kpis.profit.change).toFixed(1) }}%
          </span>
        </div>
      </div>

      <div class="kpi-card roi">
        <div class="kpi-icon">
          <UIcon name="i-heroicons-chart-bar" />
        </div>
        <div class="kpi-content">
          <span class="kpi-label">ROI</span>
          <span class="kpi-value">{{ kpis.roi.value.toFixed(1) }}%</span>
          <span class="kpi-change" :class="getChangeClass(kpis.roi.change)">
            <UIcon :name="getChangeIcon(kpis.roi.change)" />
            {{ Math.abs(kpis.roi.change).toFixed(1) }}%
          </span>
        </div>
      </div>

      <div class="kpi-card leads">
        <div class="kpi-icon">
          <UIcon name="i-heroicons-users" />
        </div>
        <div class="kpi-content">
          <span class="kpi-label">Лиды</span>
          <span class="kpi-value">{{ formatNumber(kpis.leads.value) }}</span>
          <span class="kpi-change" :class="getChangeClass(kpis.leads.change)">
            <UIcon :name="getChangeIcon(kpis.leads.change)" />
            {{ Math.abs(kpis.leads.change).toFixed(1) }}%
          </span>
        </div>
      </div>

      <div class="kpi-card ftd">
        <div class="kpi-icon">
          <UIcon name="i-heroicons-check-badge" />
        </div>
        <div class="kpi-content">
          <span class="kpi-label">FTD</span>
          <span class="kpi-value">{{ formatNumber(kpis.ftd.value) }}</span>
          <span class="kpi-change" :class="getChangeClass(kpis.ftd.change)">
            <UIcon :name="getChangeIcon(kpis.ftd.change)" />
            {{ Math.abs(kpis.ftd.change).toFixed(1) }}%
          </span>
        </div>
      </div>

      <div class="kpi-card spend">
        <div class="kpi-icon">
          <UIcon name="i-heroicons-banknotes" />
        </div>
        <div class="kpi-content">
          <span class="kpi-label">Расходы</span>
          <span class="kpi-value">${{ formatNumber(kpis.spend.value) }}</span>
          <span class="kpi-change neutral">
            <UIcon name="i-heroicons-minus" />
            {{ Math.abs(kpis.spend.change).toFixed(1) }}%
          </span>
        </div>
      </div>

      <div class="kpi-card cpl">
        <div class="kpi-icon">
          <UIcon name="i-heroicons-calculator" />
        </div>
        <div class="kpi-content">
          <span class="kpi-label">CPL</span>
          <span class="kpi-value">${{ kpis.cpl.value.toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="charts-grid">
      <div class="chart-card main-chart">
        <h3 class="chart-title">Динамика Revenue / Расходы</h3>
        <ClientOnly>
          <TrendChart :data="trendData" />
        </ClientOnly>
      </div>

      <div class="chart-card roi-chart-card">
        <h3 class="chart-title">ROI индикатор</h3>
        <ClientOnly>
          <RoiChart :roi="kpis.roi.value" />
        </ClientOnly>
      </div>
    </div>

    <!-- Source Chart + Top Creatives -->
    <div class="charts-grid">
      <div class="chart-card">
        <h3 class="chart-title">Разбивка по источникам</h3>
        <ClientOnly>
          <SourceChart :data="sourceData" />
        </ClientOnly>
      </div>

      <div class="table-card">
        <h3 class="table-title">Топ-5 креативов по ROI</h3>
        <UTable
          :rows="topCreatives"
          :columns="creativeColumns"
          :loading="isLoading"
          :empty-state="{ icon: 'i-heroicons-circle-stack-20-solid', label: 'Нет данных' }"
        >
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
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

interface KPI {
  value: number
  change?: number
}

interface TopCreative {
  creative: string
  offer: string
  leads: number
  profit: number
  roi: number
}

interface TrendDataItem {
  date: string
  spend: number
  revenue: number
}

interface SourceDataItem {
  source: string
  spend: number
  revenue: number
}

const toast = useToast()

// State
const isLoading = ref(false)
const selectedPeriod = ref('week')
const userTeams = ref<Array<{ id: number; name: string }>>([])
const selectedTeam = ref<number | null>(null)
const userRole = ref<string>('')

const kpis = ref({
  leads: { value: 0, change: 0 },
  ftd: { value: 0, change: 0 },
  spend: { value: 0, change: 0 },
  revenue: { value: 0, change: 0 },
  profit: { value: 0, change: 0 },
  roi: { value: 0, change: 0 },
  cpl: { value: 0 }
})

const topCreatives = ref<TopCreative[]>([])
const trendData = ref<TrendDataItem[]>([])
const sourceData = ref<SourceDataItem[]>([])

const periodOptions = [
  { label: 'Вчера', value: 'yesterday' },
  { label: '3 дня', value: '3days' },
  { label: 'Неделя', value: 'week' },
  { label: 'Месяц', value: 'month' }
]

const creativeColumns = [
  { key: 'creative', label: 'Креатив' },
  { key: 'offer', label: 'Оффер' },
  { key: 'leads', label: 'Лиды' },
  { key: 'profit', label: 'Profit' },
  { key: 'roi', label: 'ROI' }
]

// Methods
function formatNumber(num: number) {
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

async function fetchUserTeams() {
  try {
    const { data } = await useFetch('/api/auth/me')
    if (data.value?.user) {
      userRole.value = data.value.user.role
      if (data.value.user.teams) {
        userTeams.value = data.value.user.teams
      }
    }
  } catch (error) {
    console.error('Failed to fetch user teams')
  }
}

function getChangeClass(change: number) {
  if (change > 0) return 'positive'
  if (change < 0) return 'negative'
  return 'neutral'
}

function getChangeIcon(change: number) {
  if (change > 0) return 'i-heroicons-arrow-trending-up'
  if (change < 0) return 'i-heroicons-arrow-trending-down'
  return 'i-heroicons-minus'
}

function getRoiClass(roi: number) {
  if (roi < 0) return 'negative'
  if (roi < 30) return 'neutral'
  return 'positive'
}

async function fetchDashboard() {
  isLoading.value = true
  try {
    let url = `/api/dashboard?period=${selectedPeriod.value}`
    if (selectedTeam.value) {
      url += `&teamId=${selectedTeam.value}`
    }

    const response = await $fetch<{
      kpis: typeof kpis.value
      topCreatives: TopCreative[]
      trendData: TrendDataItem[]
      sourceData: SourceDataItem[]
    }>(url)
    kpis.value = response.kpis
    topCreatives.value = response.topCreatives
    trendData.value = response.trendData
    sourceData.value = response.sourceData
  } catch (error) {
    toast.add({ title: 'Ошибка загрузки', color: 'red' })
  } finally {
    isLoading.value = false
  }
}

// Init
onMounted(async () => {
  await fetchUserTeams()
  fetchDashboard()
})
</script>

<style scoped>
.dashboard {
  color: #e2e8f0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
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

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

/* KPI Cards */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.kpi-card {
  background: linear-gradient(135deg, rgba(15, 15, 35, 0.9), rgba(20, 20, 45, 0.9));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  padding: 1.25rem;
  display: flex;
  gap: 1rem;
  transition: all 0.3s ease;
}

.kpi-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.5);
}

.kpi-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.kpi-card.profit .kpi-icon { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
.kpi-card.roi .kpi-icon { background: rgba(99, 102, 241, 0.2); color: #6366f1; }
.kpi-card.leads .kpi-icon { background: rgba(14, 165, 233, 0.2); color: #0ea5e9; }
.kpi-card.ftd .kpi-icon { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.kpi-card.spend .kpi-icon { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
.kpi-card.cpl .kpi-icon { background: rgba(168, 85, 247, 0.2); color: #a855f7; }

.kpi-content { display: flex; flex-direction: column; }
.kpi-label { color: #64748b; font-size: 0.8rem; font-weight: 500; }
.kpi-value { font-size: 1.25rem; font-weight: 700; color: #fff; }
.kpi-change { display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; font-weight: 500; }
.kpi-change.positive { color: #22c55e; }
.kpi-change.negative { color: #ef4444; }
.kpi-change.neutral { color: #64748b; }

/* Charts */
.charts-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.chart-card {
  background: rgba(15, 15, 35, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  padding: 1.5rem;
}

.chart-card.main-chart {
  min-height: 350px;
}

.chart-title { font-size: 1rem; font-weight: 600; margin-bottom: 1rem; }

/* Table */
.table-card {
  background: rgba(15, 15, 35, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  padding: 1.5rem;
}

.table-title { font-size: 1rem; font-weight: 600; margin-bottom: 1rem; }

.roi-indicator { width: 8px; height: 8px; border-radius: 50%; }
.roi-indicator.positive { background: #22c55e; }
.roi-indicator.neutral { background: #f59e0b; }
.roi-indicator.negative { background: #ef4444; }

@media (max-width: 1024px) {
  .charts-grid { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .page-header { flex-direction: column; gap: 1rem; }
}
</style>
