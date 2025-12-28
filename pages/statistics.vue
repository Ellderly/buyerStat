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

        <UFormGroup label="Команда" v-if="userTeams.length > 1">
          <USelectMenu
            v-model="selectedTeamFilter"
            :options="[{ id: undefined, name: 'Все команды' }, ...userTeams]"
            option-attribute="name"
            value-attribute="id"
            placeholder="Все команды"
            @change="fetchStatistics"
          />
        </UFormGroup>

        <UFormGroup label="Дата от">
          <UInput
            v-model="filters.startDate"
            type="date"
          />
        </UFormGroup>

        <UFormGroup label="Дата до">
          <UInput
            v-model="filters.endDate"
            type="date"
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

        <template #spend-data="{ row }">
          ${{ row.spend.toFixed(2) }}
        </template>

        <template #revenue-data="{ row }">
          ${{ row.revenue.toFixed(2) }}
        </template>

        <template #profit-data="{ row }">
          <span :class="getProfit(row) >= 0 ? 'text-green-500' : 'text-red-500'">
            ${{ getProfit(row).toFixed(2) }}
          </span>
        </template>

        <template #roi-data="{ row }">
          <span :class="getRoi(row) >= 0 ? 'text-green-500' : 'text-red-500'">
            {{ getRoi(row).toFixed(1) }}%
          </span>
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
            <UFormGroup label="Команда" required>
              <USelectMenu
                v-model="form.teamId"
                :options="userTeams"
                option-attribute="name"
                value-attribute="id"
                placeholder="Выберите команду"
              />
            </UFormGroup>

            <UFormGroup label="ГЕО" required>
              <UInput v-model="form.geo" placeholder="UA, PL, DE..." />
            </UFormGroup>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Оффер" required>
              <UInput v-model="form.offer" placeholder="Название оффера" />
            </UFormGroup>

            <UFormGroup label="Креатив" required>
              <UInput v-model="form.creative" placeholder="Название креатива" />
            </UFormGroup>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Лиды">
              <UInput v-model="form.leads" type="number" min="0" />
            </UFormGroup>

            <UFormGroup label="Расходы ($)">
              <UInput v-model="form.spend" type="number" step="0.01" min="0" />
            </UFormGroup>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="FTD">
              <UInput v-model="form.ftd" type="number" min="0" />
            </UFormGroup>

            <UFormGroup label="Revenue ($)">
              <UInput v-model="form.revenue" type="number" step="0.01" min="0" />
            </UFormGroup>
          </div>

          <!-- Calculated fields preview -->
          <div class="calculated-preview">
            <div class="calc-item">
              <span class="calc-label">CPL:</span>
              <span class="calc-value">${{ calculatedCPL }}</span>
            </div>
            <div class="calc-item">
              <span class="calc-label">CR%:</span>
              <span class="calc-value">{{ calculatedCR }}%</span>
            </div>
            <div class="calc-item">
              <span class="calc-label">Profit:</span>
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
  user?: { name: string; username: string }
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
const selectedTeamFilter = ref<number | undefined>(undefined)

// Filters
const filters = reactive({
  source: '',
  geo: '',
  startDate: '',
  endDate: ''
})

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
  teamId: undefined as number | undefined
})

// Options
const sourceOptions = [
  { label: 'Все источники', value: '' },
  { label: 'Facebook', value: 'FACEBOOK' },
  { label: 'Google', value: 'GOOGLE' },
  { label: 'TikTok', value: 'TIKTOK' },
  { label: 'Telegram', value: 'TELEGRAM' }
]

// Table columns
const columns = [
  { key: 'date', label: 'Дата' },
  { key: 'source', label: 'Источник' },
  { key: 'geo', label: 'ГЕО' },
  { key: 'offer', label: 'Оффер' },
  { key: 'creative', label: 'Креатив' },
  { key: 'leads', label: 'Лиды' },
  { key: 'spend', label: 'Расходы' },
  { key: 'ftd', label: 'FTD' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'profit', label: 'Profit' },
  { key: 'roi', label: 'ROI' },
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

// Methods
const getProfit = (row: Statistic) => row.revenue - row.spend

const getRoi = (row: Statistic) => {
  if (row.spend === 0) return 0
  return ((row.revenue - row.spend) / row.spend) * 100
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('ru-RU')
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

    if (user.role === 'ADMIN') {
      const { teams } = await $fetch('/api/teams')
      userTeams.value = teams
    } else if (user.teamId) {
      // For non-admins, use their assigned team
      // Note: teamName should ideally be in the session/user object
      userTeams.value = [{ 
        id: user.teamId, 
        name: user.teamName || `Team #${user.teamId}` 
      }]
    }

    // Auto-select first team if only one available (or if adding new record)
    if (userTeams.value.length === 1 && !editingId.value) {
      form.teamId = userTeams.value[0].id
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
    if (selectedTeamFilter.value) params.append('teamId', selectedTeamFilter.value.toString())

    const response = await $fetch<{ statistics: Statistic[] }>(`/api/statistics?${params}`)
    statistics.value = response.statistics
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
  fetchStatistics()
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
  form.teamId = userTeams.value.length === 1 ? userTeams.value[0].id : undefined
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
  form.teamId = (row as any).teamId || undefined
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
onMounted(() => {
  fetchUserTeams()
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

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .calculated-preview {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
