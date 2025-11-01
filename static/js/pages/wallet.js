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
        
        <!-- Payment Method Tabs -->
        <div class="payment-tabs" style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem;">
          <button class="payment-tab active" data-method="demo">
            🎮 Demo Mode
          </button>
          <button class="payment-tab" data-method="stripe">
            💳 Stripe Checkout
          </button>
        </div>

        <!-- Demo Payment Section -->
        <div class="payment-section demo-section">
          <p style="color: var(--fog); margin-bottom: 1.5rem;">
            Instant credit for testing (demo mode)
          </p>
          
          <div class="topup-options">
            <button class="topup-btn demo-topup" data-amount="500">
              <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">💵</div>
              <div style="font-weight: 700; font-size: 1.25rem;">$5</div>
              <div style="font-size: 0.75rem; color: var(--smoke);">Quick Start</div>
            </button>
            <button class="topup-btn demo-topup" data-amount="1000">
              <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">💰</div>
              <div style="font-weight: 700; font-size: 1.25rem;">$10</div>
              <div style="font-size: 0.75rem; color: var(--smoke);">Popular</div>
            </button>
            <button class="topup-btn demo-topup" data-amount="2500">
              <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">💎</div>
              <div style="font-weight: 700; font-size: 1.25rem;">$25</div>
              <div style="font-size: 0.75rem; color: var(--smoke);">Best Value</div>
            </button>
            <button class="topup-btn demo-topup" data-amount="5000">
              <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🎁</div>
              <div style="font-weight: 700; font-size: 1.25rem;">$50</div>
              <div style="font-size: 0.75rem; color: var(--smoke);">Premium</div>
            </button>
          </div>
        </div>

        <!-- Stripe Payment Section -->
        <div class="payment-section stripe-section" style="display: none;">
          <p style="color: var(--fog); margin-bottom: 1.5rem;">
            Secure payment with Stripe (uses test mode)
          </p>
          
          <div class="topup-options">
            <button class="topup-btn stripe-topup" data-amount="500">
              <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">💵</div>
              <div style="font-weight: 700; font-size: 1.25rem;">$5</div>
              <div style="font-size: 0.75rem; color: var(--smoke);">Quick Start</div>
            </button>
            <button class="topup-btn stripe-topup" data-amount="1000">
              <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">💰</div>
              <div style="font-weight: 700; font-size: 1.25rem;">$10</div>
              <div style="font-size: 0.75rem; color: var(--smoke);">Popular</div>
            </button>
            <button class="topup-btn stripe-topup" data-amount="2500">
              <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">💎</div>
              <div style="font-weight: 700; font-size: 1.25rem;">$25</div>
              <div style="font-size: 0.75rem; color: var(--smoke);">Best Value</div>
            </button>
            <button class="topup-btn stripe-topup" data-amount="5000">
              <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🎁</div>
              <div style="font-weight: 700; font-size: 1.25rem;">$50</div>
              <div style="font-size: 0.75rem; color: var(--smoke);">Premium</div>
            </button>
          </div>

          <div style="margin-top: 1.5rem; padding: 1rem; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-md);">
            <p style="color: var(--smoke); font-size: 0.875rem;">
              🔒 Powered by Stripe • Secure payment processing<br>
              💡 In test mode: Use card 4242 4242 4242 4242
            </p>
          </div>
        </div>

        <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--glass-border);">
          <p style="color: var(--smoke); font-size: 0.875rem; text-align: center;">
            💡 Demo mode provides instant credit. Stripe mode uses test payments.
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

  // Setup payment method tabs
  const paymentTabs = content.querySelectorAll('.payment-tab');
  const demoSection = content.querySelector('.demo-section');
  const stripeSection = content.querySelector('.stripe-section');
  
  paymentTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      paymentTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Show/hide sections
      const method = tab.dataset.method;
      if (method === 'demo') {
        demoSection.style.display = 'block';
        stripeSection.style.display = 'none';
      } else {
        demoSection.style.display = 'none';
        stripeSection.style.display = 'block';
      }
    });
  });

  // Setup demo topup buttons
  const demoTopupBtns = content.querySelectorAll('.demo-topup');
  demoTopupBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const amount = parseInt(btn.dataset.amount, 10);
      await handleDemoTopup(amount, btn);
    });
  });

  // Setup Stripe topup buttons
  const stripeTopupBtns = content.querySelectorAll('.stripe-topup');
  stripeTopupBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const amount = parseInt(btn.dataset.amount, 10);
      await handleStripeCheckout(amount, btn);
    });
  });
}

async function handleDemoTopup(amountCents, button) {
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

async function handleStripeCheckout(amountCents, button) {
  button.disabled = true;
  const originalContent = button.innerHTML;
  button.innerHTML = '<div class="spinner" style="width: 24px; height: 24px; border-width: 3px;"></div>';

  try {
    // Create Stripe Checkout session
    const result = await api.createCheckoutSession(amountCents);
    
    if (result.checkout_url) {
      // Redirect to Stripe Checkout
      showToast('Redirecting to Stripe Checkout...', 'info');
      
      // Redirect after a brief delay
      setTimeout(() => {
        window.location.href = result.checkout_url;
      }, 500);
    } else {
      throw new Error('No checkout URL received');
    }

  } catch (error) {
    console.error('Stripe checkout error:', error);
    
    // Handle Stripe not configured error
    if (error.message && error.message.includes('Stripe not configured')) {
      showToast('Stripe is not configured. Please use Demo Mode or contact support.', 'error');
    } else {
      showToast(error.message || 'Failed to create checkout session', 'error');
    }
    
    button.disabled = false;
    button.innerHTML = originalContent;
  }
}

export default renderWallet;

