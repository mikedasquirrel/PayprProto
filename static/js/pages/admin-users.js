// Admin User Management - View and manage users
import api from '../api.js';
import { showToast } from '../components/toast.js';
import { chartUtils } from '../components/charts.js';

export async function renderAdminUsers() {
  const content = document.getElementById('content');
  
  content.innerHTML = `
    <div class="container">
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading users...</p>
      </div>
    </div>
  `;

  try {
    const users = await api.get('/admin/users?per_page=50');
    renderUsersPage(users);
  } catch (error) {
    console.error('Users load error:', error);
    showToast('Failed to load users', 'error');
  }
}

function renderUsersPage(users) {
  const content = document.getElementById('content');
  
  content.innerHTML = `
    <div class="admin-users">
      <div style="margin-bottom: 2rem;">
        <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 0.5rem;">
          User Management
        </h1>
        <p style="color: var(--smoke);">
          View and manage platform users
        </p>
      </div>

      <!-- Search and Filters -->
      <div class="card" style="margin-bottom: 1.5rem;">
        <div style="display: flex; gap: 1rem; align-items: center;">
          <input 
            type="search" 
            id="user-search"
            placeholder="Search by email..."
            style="
              flex: 1;
              padding: 0.75rem 1rem;
              background: var(--glass-bg);
              border: 1px solid var(--glass-border);
              border-radius: var(--radius);
              color: var(--paper);
            "
          >
          <button class="btn btn-secondary" onclick="window.searchUsers()">
            🔍 Search
          </button>
        </div>
      </div>

      <!-- Users Table -->
      <div class="card">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">
          Users (${users.total || 0} total)
        </h3>
        
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid var(--glass-border);">
                <th style="text-align: left; padding: 0.75rem; color: var(--smoke); font-weight: 600; font-size: 0.875rem;">Email</th>
                <th style="text-align: right; padding: 0.75rem; color: var(--smoke); font-weight: 600; font-size: 0.875rem;">Wallet Balance</th>
                <th style="text-align: right; padding: 0.75rem; color: var(--smoke); font-weight: 600; font-size: 0.875rem;">Spent</th>
                <th style="text-align: right; padding: 0.75rem; color: var(--smoke); font-weight: 600; font-size: 0.875rem;">Transactions</th>
                <th style="text-align: right; padding: 0.75rem; color: var(--smoke); font-weight: 600; font-size: 0.875rem;">Joined</th>
                <th style="text-align: center; padding: 0.75rem; color: var(--smoke); font-weight: 600; font-size: 0.875rem;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${users.items && users.items.length > 0 ? users.items.map(user => `
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                  <td style="padding: 1rem;">
                    <div style="font-weight: 600;">${escapeHtml(user.email)}</div>
                    <div style="font-size: 0.75rem; color: var(--smoke);">ID: ${user.id}</div>
                  </td>
                  <td style="padding: 1rem; text-align: right; color: var(--primary); font-weight: 600;">
                    ${chartUtils.formatCurrency(user.wallet_cents || 0)}
                  </td>
                  <td style="padding: 1rem; text-align: right; color: var(--fog);">
                    ${chartUtils.formatCurrency(user.total_spent_cents || 0)}
                  </td>
                  <td style="padding: 1rem; text-align: right;">
                    ${user.transaction_count || 0}
                  </td>
                  <td style="padding: 1rem; text-align: right; color: var(--smoke); font-size: 0.875rem;">
                    ${new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td style="padding: 1rem; text-align: center;">
                    <button 
                      class="btn-sm btn-secondary" 
                      onclick="window.manageUser(${user.id}, '${escapeHtml(user.email)}')"
                      style="margin-right: 0.5rem;"
                    >
                      ⚙️ Manage
                    </button>
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="6" style="padding: 2rem; text-align: center; color: var(--smoke);">
                    No users found
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>

      <div style="text-align: center; margin-top: 2rem;">
        <button class="btn btn-secondary" onclick="window.location.hash='#/admin/dashboard'">
          ← Back to Dashboard
        </button>
      </div>
    </div>
  `;
  
  setupUserManagement();
}

function setupUserManagement() {
  window.searchUsers = async () => {
    const searchInput = document.getElementById('user-search');
    const query = searchInput?.value || '';
    
    try {
      const users = await api.get(`/admin/users?search=${encodeURIComponent(query)}`);
      renderUsersPage(users);
    } catch (error) {
      showToast('Search failed', 'error');
    }
  };
  
  window.manageUser = async (userId, userEmail) => {
    const action = prompt(`Manage user: ${userEmail}\n\nEnter amount to credit (use negative to debit):\nExample: 1000 for $10.00 credit, -500 for $5.00 debit`);
    
    if (action === null) return;
    
    const amountCents = parseInt(action);
    if (isNaN(amountCents)) {
      showToast('Invalid amount', 'error');
      return;
    }
    
    const note = prompt('Optional note for this adjustment:');
    
    try {
      await api.post(`/admin/users/${userId}/credit`, {
        amount_cents: amountCents,
        note: note || 'Admin adjustment'
      });
      
      showToast(`Successfully adjusted wallet by ${chartUtils.formatCurrency(Math.abs(amountCents))}`, 'success');
      
      // Reload page
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      showToast(error.message || 'Failed to adjust wallet', 'error');
    }
  };
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export default renderAdminUsers;

