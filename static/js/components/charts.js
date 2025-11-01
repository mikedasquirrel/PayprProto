// Reusable Chart Components using Chart.js

// Chart.js defaults and theme
const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#e0e0e0',
        font: {
          family: 'system-ui, -apple-system, sans-serif',
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(30, 30, 35, 0.95)',
      titleColor: '#ffffff',
      bodyColor: '#e0e0e0',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      padding: 12,
      displayColors: true,
      callbacks: {}
    }
  },
  scales: {}
};

// Format currency for charts
function formatCurrency(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

// Format number with commas
function formatNumber(num) {
  return num.toLocaleString();
}

/**
 * Create a line chart (e.g., revenue over time)
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} data - Chart data
 * @param {Object} options - Additional options
 */
export function createLineChart(canvas, data, options = {}) {
  const ctx = canvas.getContext('2d');
  
  const config = {
    type: 'line',
    data: {
      labels: data.labels || [],
      datasets: (data.datasets || []).map(dataset => ({
        label: dataset.label,
        data: dataset.data,
        borderColor: dataset.color || '#00d9ff',
        backgroundColor: dataset.bgColor || 'rgba(0, 217, 255, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: dataset.fill !== false,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: dataset.color || '#00d9ff',
        pointBorderColor: '#1e1e23',
        pointBorderWidth: 2
      }))
    },
    options: {
      ...chartDefaults,
      ...options,
      plugins: {
        ...chartDefaults.plugins,
        ...options.plugins,
        tooltip: {
          ...chartDefaults.plugins.tooltip,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (options.formatValue === 'currency') {
                label += formatCurrency(context.parsed.y);
              } else {
                label += formatNumber(context.parsed.y);
              }
              return label;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#808080',
            callback: function(value) {
              if (options.formatValue === 'currency') {
                return formatCurrency(value);
              }
              return formatNumber(value);
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            drawBorder: false
          }
        },
        x: {
          ticks: {
            color: '#808080'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            drawBorder: false
          }
        }
      }
    }
  };
  
  return new Chart(ctx, config);
}

/**
 * Create a bar chart (e.g., article performance)
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} data - Chart data
 * @param {Object} options - Additional options
 */
export function createBarChart(canvas, data, options = {}) {
  const ctx = canvas.getContext('2d');
  
  const config = {
    type: 'bar',
    data: {
      labels: data.labels || [],
      datasets: (data.datasets || []).map(dataset => ({
        label: dataset.label,
        data: dataset.data,
        backgroundColor: dataset.color || 'rgba(0, 217, 255, 0.7)',
        borderColor: dataset.borderColor || '#00d9ff',
        borderWidth: 1,
        borderRadius: 4
      }))
    },
    options: {
      ...chartDefaults,
      ...options,
      plugins: {
        ...chartDefaults.plugins,
        ...options.plugins,
        tooltip: {
          ...chartDefaults.plugins.tooltip,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (options.formatValue === 'currency') {
                label += formatCurrency(context.parsed.y);
              } else {
                label += formatNumber(context.parsed.y);
              }
              return label;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#808080',
            callback: function(value) {
              if (options.formatValue === 'currency') {
                return formatCurrency(value);
              }
              return formatNumber(value);
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            drawBorder: false
          }
        },
        x: {
          ticks: {
            color: '#808080'
          },
          grid: {
            display: false
          }
        }
      }
    }
  };
  
  return new Chart(ctx, config);
}

/**
 * Create a doughnut/pie chart (e.g., revenue splits)
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} data - Chart data
 * @param {Object} options - Additional options
 */
export function createDoughnutChart(canvas, data, options = {}) {
  const ctx = canvas.getContext('2d');
  
  const config = {
    type: 'doughnut',
    data: {
      labels: data.labels || [],
      datasets: [{
        data: data.data || [],
        backgroundColor: data.colors || [
          'rgba(0, 217, 255, 0.8)',
          'rgba(255, 0, 110, 0.8)',
          'rgba(0, 255, 157, 0.8)',
          'rgba(255, 193, 7, 0.8)',
          'rgba(156, 39, 176, 0.8)'
        ],
        borderColor: '#1e1e23',
        borderWidth: 2
      }]
    },
    options: {
      ...chartDefaults,
      ...options,
      plugins: {
        ...chartDefaults.plugins,
        ...options.plugins,
        tooltip: {
          ...chartDefaults.plugins.tooltip,
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed;
              let percentage = 0;
              if (context.dataset.data) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                percentage = ((value / total) * 100).toFixed(1);
              }
              
              if (options.formatValue === 'currency') {
                return `${label}: ${formatCurrency(value)} (${percentage}%)`;
              }
              return `${label}: ${formatNumber(value)} (${percentage}%)`;
            }
          }
        }
      }
    }
  };
  
  return new Chart(ctx, config);
}

/**
 * Create a stat card (non-chart metric display)
 * @param {Object} stat - Stat data
 * @returns {string} HTML string
 */
export function createStatCard(stat) {
  const {
    label,
    value,
    icon = '📊',
    trend = null,
    trendLabel = '',
    color = 'var(--primary)'
  } = stat;
  
  const trendHTML = trend !== null ? `
    <div style="display: flex; align-items: center; gap: 0.25rem; font-size: 0.875rem; color: ${trend >= 0 ? '#00ff9d' : '#ff006e'};">
      <span>${trend >= 0 ? '↑' : '↓'}</span>
      <span>${Math.abs(trend).toFixed(1)}%</span>
      ${trendLabel ? `<span style="color: var(--smoke); margin-left: 0.25rem;">${trendLabel}</span>` : ''}
    </div>
  ` : '';
  
  return `
    <div class="stat-card" style="
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-lg);
      padding: var(--space-5);
      backdrop-filter: var(--glass-blur);
    ">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
        <span style="color: var(--smoke); font-size: 0.875rem; font-weight: 600;">${label}</span>
        <span style="font-size: 1.5rem;">${icon}</span>
      </div>
      <div style="font-size: 2rem; font-weight: 800; color: var(--paper); margin-bottom: 0.5rem; line-height: 1;">
        ${value}
      </div>
      ${trendHTML}
    </div>
  `;
}

/**
 * Create a grid of stat cards
 * @param {Array} stats - Array of stat objects
 * @param {number} columns - Number of columns (default: 4)
 * @returns {string} HTML string
 */
export function createStatsGrid(stats, columns = 4) {
  const cards = stats.map(stat => createStatCard(stat)).join('');
  
  return `
    <div class="stats-grid" style="
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: var(--space-4);
      margin-bottom: var(--space-6);
    ">
      ${cards}
    </div>
  `;
}

/**
 * Destroy a chart instance
 * @param {Chart} chart - Chart.js instance
 */
export function destroyChart(chart) {
  if (chart) {
    chart.destroy();
  }
}

/**
 * Update chart data
 * @param {Chart} chart - Chart.js instance
 * @param {Object} newData - New data
 */
export function updateChartData(chart, newData) {
  if (!chart) return;
  
  chart.data.labels = newData.labels || chart.data.labels;
  chart.data.datasets.forEach((dataset, i) => {
    if (newData.datasets && newData.datasets[i]) {
      dataset.data = newData.datasets[i].data;
    }
  });
  
  chart.update();
}

// Export utilities
export const chartUtils = {
  formatCurrency,
  formatNumber
};

