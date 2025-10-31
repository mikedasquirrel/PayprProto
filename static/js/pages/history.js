// Transaction History Page
import api from '../api.js';
import auth from '../auth.js';

export async function renderHistory() {
  const content = document.getElementById('content');

  // Check authentication
  if (!auth.isAuthenticated) {
    content.innerHTML = `
      <div class="container">
        <div class="empty-state">
          <div class="empty-icon">🔒</div>
          <h2 class="empty-message">Login Required</h2>
          <button class="btn btn-primary" onclick="window.location.hash='#/login'">
            Log In
          </button>
        </div>
      </div>
    `;
    return;
  }

  // Show loading
  content.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading transactions...</p>
    </div>
  `;

  try {
    const data = await api.getTransactions();
    const transactions = data.transactions || [];

    content.innerHTML = `
      <div class="container" style="max-width: 900px;">
        <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 2rem;">
          Transaction History
        </h1>

        ${transactions.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">📜</div>
            <p class="empty-message">No transactions yet</p>
            <p style="color: var(--smoke); margin-bottom: 2rem;">
              Your transaction history will appear here
            </p>
            <button class="btn btn-primary" onclick="window.location.hash='#/'">
              Browse Articles
            </button>
          </div>
        ` : `
          <div class="transaction-list">
            ${transactions.map(txn => renderTransaction(txn)).join('')}
          </div>

          <div style="margin-top: 2rem; padding: 1.5rem; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-lg);">
            <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem;">Summary</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1.5rem;">
              <div>
                <div style="color: var(--smoke); font-size: 0.875rem; margin-bottom: 0.25rem;">Total Spent</div>
                <div style="font-size: 1.5rem; font-weight: 700; color: var(--accent-primary);">
                  $${calculateTotalSpent(transactions).toFixed(2)}
                </div>
              </div>
              <div>
                <div style="color: var(--smoke); font-size: 0.875rem; margin-bottom: 0.25rem;">Articles Unlocked</div>
                <div style="font-size: 1.5rem; font-weight: 700; color: var(--accent-secondary);">
                  ${transactions.filter(t => t.type === 'debit').length}
                </div>
              </div>
              <div>
                <div style="color: var(--smoke); font-size: 0.875rem; margin-bottom: 0.25rem;">Refunds</div>
                <div style="font-size: 1.5rem; font-weight: 700; color: var(--accent-tertiary);">
                  ${transactions.filter(t => t.type === 'refund').length}
                </div>
              </div>
            </div>
          </div>
        `}
      </div>
    `;

  } catch (error) {
    console.error('Error loading history:', error);
    content.innerHTML = `
      <div class="container">
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h2 class="empty-message">Failed to load transactions</h2>
          <p style="color: var(--smoke); margin-bottom: 2rem;">${error.message}</p>
          <button class="btn btn-primary" onclick="window.location.reload()">
            Try Again
          </button>
        </div>
      </div>
    `;
  }
}

function renderTransaction(txn) {
  const date = new Date(txn.created_at);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const isDebit = txn.type === 'debit';
  const amountClass = isDebit ? 'debit' : 'credit';
  const amountSign = isDebit ? '-' : '+';

  return `
    <div class="transaction-item">
      <div class="transaction-details">
        <div class="transaction-title">
          ${txn.article_title || 'Transaction'}
        </div>
        <div class="transaction-subtitle">
          ${txn.publisher_name || ''} • ${formattedDate} • ${txn.type}
        </div>
        ${txn.split ? `
          <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
            ${Object.entries(txn.split).map(([role, cents]) => `
              <span class="chip" style="font-size: 0.65rem;">
                ${role}: $${(cents / 100).toFixed(2)}
              </span>
            `).join('')}
          </div>
        ` : ''}
      </div>
      <div class="transaction-amount ${amountClass}">
        ${amountSign}$${(txn.price_cents / 100).toFixed(2)}
      </div>
    </div>
  `;
}

function calculateTotalSpent(transactions) {
  return transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + (t.price_cents || 0), 0) / 100;
}

export default renderHistory;

