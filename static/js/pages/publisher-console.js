// Publisher Console - Main dashboard with analytics
import api from '../api.js';
import router from '../router.js';
import { showToast } from '../components/toast.js';
import { createLineChart, createBarChart, createStatsGrid, destroyChart, chartUtils } from '../components/charts.js';

let revenueChart = null;
let articlesChart = null;

export async function renderPublisherConsole() {
  const content = document.getElementById('content');
  
  // Show loading state
  content.innerHTML = `
    <div class="container">
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading publisher console...</p>
      </div>
    </div>
  `;

  try {
    // Fetch publisher stats
    const stats = await api.getPublisherStats();
    const articles = await api.getPublisherArticles();
    
    // Render dashboard
    renderDashboard(stats, articles);
    
  } catch (error) {
    console.error('Publisher console error:', error);
    
    // Check if it's an auth error
    if (error.status === 401) {
      content.innerHTML = `
        <div class="container">
          <div class="empty-state">
            <div class="empty-icon">🔒</div>
            <h2 class="empty-message">Publisher Access Required</h2>
            <p style="color: var(--smoke); margin-bottom: 2rem;">
              You need to be logged in as a publisher to access this console
            </p>
            <button class="btn btn-primary" onclick="window.location.hash='#/login'">
              Log In
            </button>
          </div>
        </div>
      `;
    } else {
      content.innerHTML = `
        <div class="container">
          <div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <h2 class="empty-message">Error Loading Console</h2>
            <p style="color: var(--smoke); margin-bottom: 2rem;">
              ${error.message || 'Unable to load publisher data'}
            </p>
            <button class="btn btn-primary" onclick="window.location.hash='#/'">
              Go Home
            </button>
          </div>
        </div>
      `;
    }
  }
}

function renderDashboard(stats, articles) {
  const content = document.getElementById('content');
  
  // Destroy existing charts
  if (revenueChart) destroyChart(revenueChart);
  if (articlesChart) destroyChart(articlesChart);
  
  const {
    all_time_revenue_cents = 0,
    seven_day_revenue_cents = 0,
    total_unlocks = 0,
    total_articles = 0,
    seven_day_unlocks = 0
  } = stats;
  
  // Calculate stats
  const avgRevenuePerArticle = total_articles > 0 
    ? all_time_revenue_cents / total_articles 
    : 0;
  
  const avgRevenuePerUnlock = total_unlocks > 0
    ? all_time_revenue_cents / total_unlocks
    : 0;
  
  // Create stats for cards
  const statsCards = [
    {
      label: 'All-Time Revenue',
      value: chartUtils.formatCurrency(all_time_revenue_cents),
      icon: '💰',
      color: 'var(--primary)'
    },
    {
      label: '7-Day Revenue',
      value: chartUtils.formatCurrency(seven_day_revenue_cents),
      icon: '📈',
      trend: total_unlocks > 0 ? ((seven_day_unlocks / total_unlocks) * 100 - 50) : 0,
      trendLabel: 'vs avg'
    },
    {
      label: 'Total Articles',
      value: chartUtils.formatNumber(total_articles),
      icon: '📰',
      color: 'var(--accent)'
    },
    {
      label: 'Total Unlocks',
      value: chartUtils.formatNumber(total_unlocks),
      icon: '🔓',
      color: 'var(--success)'
    }
  ];
  
  content.innerHTML = `
    <div class="publisher-console">
      <div class="console-header" style="margin-bottom: 2rem;">
        <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 0.5rem;">
          Publisher Console
        </h1>
        <p style="color: var(--smoke);">
          Analytics and performance metrics for your publications
        </p>
      </div>

      ${createStatsGrid(statsCards, 4)}

      <div class="charts-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: var(--space-6); margin-bottom: var(--space-6);">
        <!-- Revenue Chart -->
        <div class="card">
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">
            Revenue Over Time
          </h3>
          <div style="height: 300px;">
            <canvas id="revenue-chart"></canvas>
          </div>
        </div>

        <!-- Articles Performance Chart -->
        <div class="card">
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">
            Top Performing Articles
          </h3>
          <div style="height: 300px;">
            <canvas id="articles-chart"></canvas>
          </div>
        </div>
      </div>

      <!-- Articles Table -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.25rem; font-weight: 700;">
            Article Performance
          </h3>
          <button class="btn btn-secondary btn-sm" onclick="window.exportTransactions()">
            📥 Export CSV
          </button>
        </div>
        
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid var(--glass-border);">
                <th style="text-align: left; padding: 0.75rem; color: var(--smoke); font-weight: 600; font-size: 0.875rem;">Article</th>
                <th style="text-align: right; padding: 0.75rem; color: var(--smoke); font-weight: 600; font-size: 0.875rem;">Unlocks</th>
                <th style="text-align: right; padding: 0.75rem; color: var(--smoke); font-weight: 600; font-size: 0.875rem;">Revenue</th>
                <th style="text-align: right; padding: 0.75rem; color: var(--smoke); font-weight: 600; font-size: 0.875rem;">Avg Price</th>
                <th style="text-align: right; padding: 0.75rem; color: var(--smoke); font-weight: 600; font-size: 0.875rem;">Status</th>
              </tr>
            </thead>
            <tbody id="articles-table-body">
              ${articles.items && articles.items.length > 0 ? articles.items.map(article => `
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                  <td style="padding: 1rem;">
                    <div style="font-weight: 600; margin-bottom: 0.25rem;">${escapeHtml(article.title)}</div>
                    <div style="font-size: 0.875rem; color: var(--smoke);">${escapeHtml(article.author || 'Unknown')}</div>
                  </td>
                  <td style="padding: 1rem; text-align: right; color: var(--paper);">
                    ${chartUtils.formatNumber(article.unlock_count || 0)}
                  </td>
                  <td style="padding: 1rem; text-align: right; color: var(--primary); font-weight: 600;">
                    ${chartUtils.formatCurrency(article.total_revenue_cents || 0)}
                  </td>
                  <td style="padding: 1rem; text-align: right; color: var(--fog);">
                    ${chartUtils.formatCurrency(article.price_cents || 0)}
                  </td>
                  <td style="padding: 1rem; text-align: right;">
                    <span style="
                      display: inline-block;
                      padding: 0.25rem 0.75rem;
                      background: ${article.status === 'published' ? 'rgba(0, 255, 157, 0.1)' : 'rgba(128, 128, 128, 0.1)'};
                      color: ${article.status === 'published' ? '#00ff9d' : '#808080'};
                      border-radius: var(--radius);
                      font-size: 0.75rem;
                      font-weight: 600;
                    ">
                      ${article.status || 'published'}
                    </span>
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="5" style="padding: 2rem; text-align: center; color: var(--smoke);">
                    No articles found
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Quick Actions -->
      <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem; flex-wrap: wrap;">
        <button class="btn btn-secondary" onclick="window.location.hash='#/publisher/content'">
          📝 Manage Content
        </button>
        <button class="btn btn-secondary" onclick="window.location.hash='#/publisher/authors'">
          👥 Manage Authors
        </button>
        <button class="btn btn-secondary" onclick="window.location.hash='#/publisher/settings'">
          ⚙️ Settings
        </button>
      </div>
    </div>
  `;
  
  // Initialize charts
  setTimeout(() => {
    initializeCharts(stats, articles);
  }, 100);
  
  // Setup export function
  window.exportTransactions = async () => {
    try {
      const blob = await api.getPublisherTransactions('csv');
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('CSV exported successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to export CSV', 'error');
    }
  };
}

function initializeCharts(stats, articles) {
  // Revenue chart (mock data for now - in production would come from API)
  const revenueCanvas = document.getElementById('revenue-chart');
  if (revenueCanvas) {
    // Generate last 30 days mock data
    const days = [];
    const revenueData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      // Mock revenue data - in production this would come from API
      revenueData.push(Math.floor(Math.random() * 5000) + 1000);
    }
    
    revenueChart = createLineChart(revenueCanvas, {
      labels: days,
      datasets: [{
        label: 'Revenue',
        data: revenueData,
        color: '#00d9ff',
        fill: true
      }]
    }, {
      formatValue: 'currency'
    });
  }
  
  // Top articles chart
  const articlesCanvas = document.getElementById('articles-chart');
  if (articlesCanvas && articles.items) {
    const topArticles = articles.items
      .sort((a, b) => (b.total_revenue_cents || 0) - (a.total_revenue_cents || 0))
      .slice(0, 5);
    
    articlesChart = createBarChart(articlesCanvas, {
      labels: topArticles.map(a => truncate(a.title, 30)),
      datasets: [{
        label: 'Revenue',
        data: topArticles.map(a => a.total_revenue_cents || 0),
        color: 'rgba(0, 217, 255, 0.7)'
      }]
    }, {
      formatValue: 'currency'
    });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen) + '...';
}

export default renderPublisherConsole;

