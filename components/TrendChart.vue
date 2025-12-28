<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface TrendData {
  date: string
  spend: number
  revenue: number
}

const props = defineProps<{
  data: TrendData[]
}>()

const chartData = computed(() => ({
  labels: props.data.map(d => {
    const date = new Date(d.date)
    return `${date.getDate()}/${date.getMonth() + 1}`
  }),
  datasets: [
    {
      label: 'Revenue',
      data: props.data.map(d => d.revenue),
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#22c55e',
      pointBorderColor: '#22c55e',
      pointRadius: 4,
      pointHoverRadius: 6
    },
    {
      label: 'Расходы',
      data: props.data.map(d => d.spend),
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#ef4444',
      pointBorderColor: '#ef4444',
      pointRadius: 4,
      pointHoverRadius: 6
    }
  ]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index' as const
  },
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: '#94a3b8',
        usePointStyle: true,
        padding: 20,
        font: { size: 12 }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 15, 35, 0.95)',
      titleColor: '#fff',
      bodyColor: '#94a3b8',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      padding: 12,
      displayColors: true,
      callbacks: {
        label: (context: any) => `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`
      }
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(255, 255, 255, 0.05)' },
      ticks: { color: '#64748b' }
    },
    y: {
      grid: { color: 'rgba(255, 255, 255, 0.05)' },
      ticks: {
        color: '#64748b',
        callback: (value: any) => '$' + value
      }
    }
  }
}
</script>

<template>
  <div class="chart-wrapper">
    <Line v-if="data.length > 0" :data="chartData" :options="chartOptions" />
    <div v-else class="chart-empty">
      <UIcon name="i-heroicons-chart-bar" class="empty-icon" />
      <p>Добавьте статистику для отображения графика</p>
    </div>
  </div>
</template>

<style scoped>
.chart-wrapper {
  height: 280px;
  position: relative;
}

.chart-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #475569;
  gap: 0.75rem;
}

.empty-icon {
  width: 3rem;
  height: 3rem;
  opacity: 0.5;
}
</style>
