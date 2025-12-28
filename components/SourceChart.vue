<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface SourceData {
  source: string
  spend: number
  revenue: number
}

const props = defineProps<{
  data: SourceData[]
}>()

const chartData = computed(() => ({
  labels: props.data.map(d => d.source),
  datasets: [
    {
      label: 'Revenue',
      data: props.data.map(d => d.revenue),
      backgroundColor: 'rgba(34, 197, 94, 0.8)',
      borderRadius: 6,
      barThickness: 20
    },
    {
      label: 'Расходы',
      data: props.data.map(d => d.spend),
      backgroundColor: 'rgba(239, 68, 68, 0.8)',
      borderRadius: 6,
      barThickness: 20
    }
  ]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
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
      callbacks: {
        label: (context: any) => `${context.dataset.label}: $${context.parsed.x.toFixed(2)}`
      }
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(255, 255, 255, 0.05)' },
      ticks: {
        color: '#64748b',
        callback: (value: any) => '$' + value
      }
    },
    y: {
      grid: { display: false },
      ticks: { color: '#94a3b8' }
    }
  }
}
</script>

<template>
  <div class="chart-wrapper">
    <Bar v-if="data.length > 0" :data="chartData" :options="chartOptions" />
    <div v-else class="chart-empty">
      <UIcon name="i-heroicons-chart-bar-square" class="empty-icon" />
      <p>Нет данных по источникам</p>
    </div>
  </div>
</template>

<style scoped>
.chart-wrapper {
  height: 250px;
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
