<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps<{
  roi: number
}>()

const chartData = computed(() => {
  const normalizedRoi = Math.min(Math.max(props.roi, -100), 200)
  const positive = normalizedRoi >= 0 ? normalizedRoi : 0
  const negative = normalizedRoi < 0 ? Math.abs(normalizedRoi) : 0
  const remaining = 100 - positive - negative
  
  return {
    labels: ['ROI', 'Убыток', 'Потенциал'],
    datasets: [{
      data: [positive, negative, remaining > 0 ? remaining : 0],
      backgroundColor: [
        props.roi >= 30 ? '#22c55e' : props.roi >= 0 ? '#f59e0b' : '#ef4444',
        '#ef4444',
        'rgba(100, 116, 139, 0.2)'
      ],
      borderWidth: 0,
      cutout: '75%'
    }]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15, 15, 35, 0.95)',
      titleColor: '#fff',
      bodyColor: '#94a3b8',
      callbacks: {
        label: (context: any) => `${context.label}: ${context.parsed.toFixed(1)}%`
      }
    }
  }
}

const roiClass = computed(() => {
  if (props.roi < 0) return 'negative'
  if (props.roi < 30) return 'neutral'
  return 'positive'
})
</script>

<template>
  <div class="roi-chart">
    <div class="chart-container">
      <Doughnut :data="chartData" :options="chartOptions" />
      <div class="roi-center">
        <span class="roi-value" :class="roiClass">{{ roi.toFixed(1) }}%</span>
        <span class="roi-label">ROI</span>
      </div>
    </div>
    <div class="roi-legend">
      <div class="legend-item">
        <span class="legend-dot positive"></span>
        <span>> 30% отлично</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot neutral"></span>
        <span>0-30% норма</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot negative"></span>
        <span>< 0% убыток</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.roi-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
}

.chart-container {
  position: relative;
  width: 180px;
  height: 180px;
  margin-bottom: 1.5rem;
}

.roi-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.roi-value {
  display: block;
  font-size: 1.75rem;
  font-weight: 700;
}

.roi-value.positive { color: #22c55e; }
.roi-value.neutral { color: #f59e0b; }
.roi-value.negative { color: #ef4444; }

.roi-label {
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.roi-legend {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #94a3b8;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-dot.positive { background: #22c55e; }
.legend-dot.neutral { background: #f59e0b; }
.legend-dot.negative { background: #ef4444; }
</style>
