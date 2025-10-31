// Wallet Page - Balance and topup
import api from '../api.js';
import auth from '../auth.js';
import router from '../router.js';
import { showToast } from '../components/toast.js';

export async function renderWallet() {
  const content = document.getElementById('content');

  // Check authentication
  if (!auth.isAuthenticated) {
    content.innerHTML = `
      <div class="container">
        <div class="empty-state">
          <div class="empty-icon">🔒</div>
          <h2 class="empty-message">Login Required</h2>
          <p style="color: var(--smoke); margin-bottom: 2rem;">
            Please log in to view your wallet
          </p>
          <button class="btn btn-primary" onclick="window.location.hash='#/login'">
            Log In
          </button>
        </div>
      </div>
    `;
    return;
  }

  const walletBalance = auth.getWalletBalance();

  content.innerHTML = `
    <div class="wallet-container">
      <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 2rem;">
        Your Wallet
      </h1>

      <div class="balance-card">
        <div class="balance-label">Current Balance</div>
        <div class="balance-amount">$${(walletBalance / 100).toFixed(2)}</div>
        <p style="color: var(--smoke); font-size: 0.875rem;">
          ✨ ${auth.user?.email}
        </p>
      </div>

      <div class="card">
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem;">
          Add Funds
        </h2>
        <p style="color: var(--fog); margin-bottom: 1.5rem;">
          Choose an amount to add to your wallet
        </p>
        
        <div class="topup-options">
          <button class="topup-btn" data-amount="500">
            <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">💵</div>
            <div style="font-weight: 700; font-size: 1.25rem;">$5</div>
            <div style="font-size: 0.75rem; color: var(--smoke);">Quick Start</div>
          </button>
          <button class="topup-btn" data-amount="1000">
            <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">💰</div>
            <div style="font-weight: 700; font-size: 1.25rem;">$10</div>
            <div style="font-size: 0.75rem; color: var(--smoke);">Popular</div>
          </button>
          <button class="topup-btn" data-amount="2500">
            <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">💎</div>
            <div style="font-weight: 700; font-size: 1.25rem;">$25</div>
            <div style="font-size: 0.75rem; color: var(--smoke);">Best Value</div>
          </button>
          <button class="topup-btn" data-amount="5000">
            <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🎁</div>
            <div style="font-weight: 700; font-size: 1.25rem;">$50</div>
            <div style="font-size: 0.75rem; color: var(--smoke);">Premium</div>
          </button>
        </div>

        <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--glass-border);">
          <p style="color: var(--smoke); font-size: 0.875rem; text-align: center;">
            💡 This is a demo. All payments are simulated. In production, this would integrate with Stripe.
          </p>
        </div>
      </div>

      <div style="text-align: center; margin-top: 2rem;">
        <a href="#/history" class="btn btn-secondary">
          View Transaction History
        </a>
      </div>
    </div>
  `;

  // Setup topup buttons
  const topupBtns = content.querySelectorAll('.topup-btn');
  topupBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const amount = parseInt(btn.dataset.amount, 10);
      await handleTopup(amount, btn);
    });
  });
}

async function handleTopup(amountCents, button) {
  button.disabled = true;
  const originalContent = button.innerHTML;
  button.innerHTML = '<div class="spinner" style="width: 24px; height: 24px; border-width: 3px;"></div>';

  try {
    // Use dev topup API
    const result = await api.topupWallet(amountCents);
    
    // Update local auth state
    auth.updateWalletBalance(result.balance_cents);

    showToast(`Successfully added $${(amountCents / 100).toFixed(2)} to your wallet!`, 'success');

    // Refresh the page to show new balance
    setTimeout(() => {
      router.navigate('/wallet');
      renderWallet();
    }, 500);

  } catch (error) {
    console.error('Topup error:', error);
    showToast(error.message || 'Failed to add funds', 'error');
    button.disabled = false;
    button.innerHTML = originalContent;
  }
}

export default renderWallet;

