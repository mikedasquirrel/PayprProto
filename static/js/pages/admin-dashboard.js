// Admin Dashboard - Platform-wide analytics and management
import api from '../api.js';
import router from '../router.js';
import { showToast } from '../components/toast.js';
import { createLineChart, createBarChart, createStatsGrid, destroyChart, chartUtils } from '../components/charts.js';

let platformRevenueChart = null;
let userGrowthChart = null;

export async function renderAdminDashboard() {
  const content = document.getElementById('content');
  
  // Check if admin is logged in (basic check)
  // In production, this would be verified server-side
  
  content.innerHTML = `
    <div class="container">
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    </div>
  `;

  try {
    // Fetch platform-wide statistics
    // Note: These endpoints would need to be created in the backend
    // For now, we'll mock the data structure
    
    const mockStats = {
      total_revenue_cents: 125000,
      total_users: 1250,
      total_publishers: 8,
      total_articles: 69,
      total_transactions: 3420,
      active_users_7d: 340,
      revenue_7d_cents: 15000,
      new_users_7d: 87
    };
    
    renderDashboard(mockStats);
    
  } catch (error) {
    console.error('Admin dashboard error:', error);
    
    content.innerHTML = `
      <div class="container">
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h2 class="empty-message">Error Loading Dashboard</h2>
          <p style="color: var(--smoke); margin-bottom: 2rem;">
            ${error.message || 'Unable to load admin data'}
          </p>
          <button class="btn btn-primary" onclick="window.location.hash='#/'">
            Go Home
          </button>
        </div>
      </div>
    `;
  }
}

function renderDashboard(stats) {
  const content = document.getElementById('content');
  
  // Destroy existing charts
  if (platformRevenueChart) destroyChart(platformRevenueChart);
  if (userGrowthChart) destroyChart(userGrowthChart);
  
  const {
    total_revenue_cents = 0,
    total_users = 0,
    total_publishers = 0,
    total_articles = 0,
    total_transactions = 0,
    active_users_7d = 0,
    revenue_7d_cents = 0,
    new_users_7d = 0
  } = stats;
  
  // Calculate metrics
  const avgRevenuePerUser = total_users > 0 ? total_revenue_cents / total_users : 0;
  const avgTransactionValue = total_transactions > 0 ? total_revenue_cents / total_transactions : 0;
  const userGrowthRate = total_users > 0 ? ((new_users_7d / total_users) * 100) : 0;
  
  const statsCards = [
    {
      label: 'Total Revenue',
      value: chartUtils.formatCurrency(total_revenue_cents),
      icon: '💰',
      trend: revenue_7d_cents > 0 ? 12.5 : 0,
      trendLabel: 'vs last 7d'
    },
    {
      label: 'Total Users',
      value: chartUtils.formatNumber(total_users),
      icon: '👥',
      trend: userGrowthRate,
      trendLabel: 'growth'
    },
    {
      label: 'Active Publishers',
      value: chartUtils.formatNumber(total_publishers),
      icon: '📰',
    },
    {
      label: 'Total Articles',
      value: chartUtils.formatNumber(total_articles),
      icon: '📝',
    }
  ];
  
  content.innerHTML = `
    <div class="admin-dashboard">
      <div class="dashboard-header" style="margin-bottom: 2rem;">
        <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 0.5rem;">
          Platform Analytics
        </h1>
        <p style="color: var(--smoke);">
          System-wide metrics and management
        </p>
      </div>

      ${createStatsGrid(statsCards, 4)}

      <div class="charts-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: var(--space-6); margin-bottom: var(--space-6);">
        <!-- Platform Revenue Chart -->
        <div class="card">
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">
            Platform Revenue (Last 30 Days)
          </h3>
          <div style="height: 300px;">
            <canvas id="platform-revenue-chart"></canvas>
          </div>
        </div>

        <!-- User Growth Chart -->
        <div class="card">
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">
            User Growth
          </h3>
          <div style="height: 300px;">
            <canvas id="user-growth-chart"></canvas>
          </div>
        </div>
      </div>

      <!-- Quick Stats Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-6);">
        <div class="card">
          <h4 style="font-size: 0.875rem; color: var(--smoke); margin-bottom: 0.5rem;">
            Avg Revenue / User
          </h4>
          <div style="font-size: 1.5rem; font-weight: 800; color: var(--primary);">
            ${chartUtils.formatCurrency(avgRevenuePerUser)}
          </div>
        </div>
        
        <div class="card">
          <h4 style="font-size: 0.875rem; color: var(--smoke); margin-bottom: 0.5rem;">
            Avg Transaction Value
          </h4>
          <div style="font-size: 1.5rem; font-weight: 800; color: var(--primary);">
            ${chartUtils.formatCurrency(avgTransactionValue)}
          </div>
        </div>
        
        <div class="card">
          <h4 style="font-size: 0.875rem; color: var(--smoke); margin-bottom: 0.5rem;">
            Active Users (7d)
          </h4>
          <div style="font-size: 1.5rem; font-weight: 800; color: var(--success);">
            ${chartUtils.formatNumber(active_users_7d)}
          </div>
        </div>
        
        <div class="card">
          <h4 style="font-size: 0.875rem; color: var(--smoke); margin-bottom: 0.5rem;">
            Total Transactions
          </h4>
          <div style="font-size: 1.5rem; font-weight: 800; color: var(--fog);">
            ${chartUtils.formatNumber(total_transactions)}
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="card" style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">
          Quick Actions
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <button class="btn btn-secondary" onclick="window.location.hash='#/admin/users'">
            👥 Manage Users
          </button>
          <button class="btn btn-secondary" onclick="window.location.hash='#/admin/theme'">
            🎨 Theme Editor
          </button>
          <button class="btn btn-secondary" onclick="window.location.hash='#/admin/site'">
            ⚙️ Site Settings
          </button>
          <button class="btn btn-secondary" onclick="window.location.hash='#/admin/splits'">
            💵 Revenue Splits
          </button>
        </div>
      </div>

      <div style="text-align: center;">
        <button class="btn btn-secondary" onclick="window.location.hash='#/'">
          ← Back to Home
        </button>
      </div>
    </div>
  `;
  
  // Initialize charts
  setTimeout(() => {
    initializeCharts(stats);
  }, 100);
}

function initializeCharts(stats) {
  // Platform revenue chart (mock data)
  const revenueCanvas = document.getElementById('platform-revenue-chart');
  if (revenueCanvas) {
    const days = [];
    const revenueData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      revenueData.push(Math.floor(Math.random() * 3000) + 2000);
    }
    
    platformRevenueChart = createLineChart(revenueCanvas, {
      labels: days,
      datasets: [{
        label: 'Daily Revenue',
        data: revenueData,
        color: '#00d9ff',
        fill: true
      }]
    }, {
      formatValue: 'currency'
    });
  }
  
  // User growth chart (mock data)
  const userCanvas = document.getElementById('user-growth-chart');
  if (userCanvas) {
    const weeks = [];
    const userData = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - (i * 7));
      weeks.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      userData.push(Math.floor(Math.random() * 50) + 20);
    }
    
    userGrowthChart = createBarChart(userCanvas, {
      labels: weeks,
      datasets: [{
        label: 'New Users',
        data: userData,
        color: 'rgba(0, 255, 157, 0.7)',
        borderColor: '#00ff9d'
      }]
    });
  }
}

export default renderAdminDashboard;

