// Payment Success Page - Handle Stripe Checkout return
import api from '../api.js';
import auth from '../auth.js';
import router from '../router.js';
import { showToast } from '../components/toast.js';

export async function renderPaymentSuccess() {
  const content = document.getElementById('content');
  
  // Get session_id from URL
  const params = new URLSearchParams(window.location.hash.split('?')[1]);
  const sessionId = params.get('session_id');
  const amount = params.get('amount');
  
  if (!sessionId) {
    content.innerHTML = `
      <div class="container">
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h2 class="empty-message">Invalid Payment Session</h2>
          <p style="color: var(--smoke); margin-bottom: 2rem;">
            No payment session found
          </p>
          <button class="btn btn-primary" onclick="window.location.hash='#/wallet'">
            Return to Wallet
          </button>
        </div>
      </div>
    `;
    return;
  }

  // Show loading state
  content.innerHTML = `
    <div class="container" style="max-width: 600px; margin-top: 4rem;">
      <div class="card" style="text-align: center; padding: 3rem 2rem;">
        <div class="spinner" style="margin: 0 auto 2rem;"></div>
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem;">
          Processing Payment
        </h2>
        <p style="color: var(--smoke);">
          Verifying your payment with Stripe...
        </p>
      </div>
    </div>
  `;

  try {
    // Verify the payment session and credit the wallet
    const result = await api.verifyCheckoutSession(sessionId);
    
    // Update auth state with new balance
    if (result.balance_cents !== undefined) {
      auth.updateWalletBalance(result.balance_cents);
    }

    const amountCredited = result.amount_credited || parseInt(amount) || 0;
    const alreadyCredited = result.already_credited || false;

    // Show success message
    content.innerHTML = `
      <div class="container" style="max-width: 600px; margin-top: 4rem;">
        <div class="card" style="text-align: center; padding: 3rem 2rem;">
          <div style="font-size: 4rem; margin-bottom: 1.5rem;">
            ${alreadyCredited ? '✓' : '🎉'}
          </div>
          <h2 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 1rem;">
            ${alreadyCredited ? 'Already Credited' : 'Payment Successful!'}
          </h2>
          <p style="color: var(--smoke); margin-bottom: 2rem; font-size: 1.125rem;">
            ${alreadyCredited 
              ? 'This payment was already credited to your wallet'
              : `$${(amountCredited / 100).toFixed(2)} has been added to your wallet`
            }
          </p>
          
          <div class="balance-card" style="margin-bottom: 2rem;">
            <div class="balance-label">New Balance</div>
            <div class="balance-amount">$${(result.balance_cents / 100).toFixed(2)}</div>
          </div>

          <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-primary" onclick="window.location.hash='#/'">
              Browse Articles
            </button>
            <button class="btn btn-secondary" onclick="window.location.hash='#/wallet'">
              View Wallet
            </button>
          </div>

          <p style="color: var(--smoke); font-size: 0.875rem; margin-top: 2rem;">
            Receipt sent to ${auth.user?.email || 'your email'}
          </p>
        </div>
      </div>
    `;

    // Show success toast
    if (!alreadyCredited) {
      showToast(`Successfully added $${(amountCredited / 100).toFixed(2)}!`, 'success');
    }

  } catch (error) {
    console.error('Payment verification error:', error);
    
    // Show error message
    content.innerHTML = `
      <div class="container" style="max-width: 600px; margin-top: 4rem;">
        <div class="card" style="text-align: center; padding: 3rem 2rem;">
          <div style="font-size: 4rem; margin-bottom: 1.5rem;">⚠️</div>
          <h2 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 1rem;">
            Payment Verification Failed
          </h2>
          <p style="color: var(--smoke); margin-bottom: 2rem;">
            ${error.message || 'Unable to verify payment. Please contact support if you were charged.'}
          </p>
          
          <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-primary" onclick="window.location.hash='#/wallet'">
              Return to Wallet
            </button>
            <button class="btn btn-secondary" onclick="window.location.hash='#/history'">
              View History
            </button>
          </div>

          <div style="margin-top: 2rem; padding: 1rem; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-md);">
            <p style="color: var(--smoke); font-size: 0.875rem;">
              Session ID: ${sessionId.substring(0, 20)}...
            </p>
          </div>
        </div>
      </div>
    `;
    
    showToast('Payment verification failed', 'error');
  }
}

export default renderPaymentSuccess;

