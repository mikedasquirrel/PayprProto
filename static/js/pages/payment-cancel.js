// Payment Cancel Page - Handle Stripe Checkout cancellation
import router from '../router.js';

export async function renderPaymentCancel() {
  const content = document.getElementById('content');
  
  content.innerHTML = `
    <div class="container" style="max-width: 600px; margin-top: 4rem;">
      <div class="card" style="text-align: center; padding: 3rem 2rem;">
        <div style="font-size: 4rem; margin-bottom: 1.5rem;">💳</div>
        <h2 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 1rem;">
          Payment Cancelled
        </h2>
        <p style="color: var(--smoke); margin-bottom: 2rem;">
          Your payment was cancelled. No charges were made.
        </p>
        
        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
          <button class="btn btn-primary" onclick="window.location.hash='#/wallet'">
            Try Again
          </button>
          <button class="btn btn-secondary" onclick="window.location.hash='#/'">
            Browse Articles
          </button>
        </div>

        <div style="margin-top: 2rem; padding: 1rem; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-md);">
          <p style="color: var(--smoke); font-size: 0.875rem;">
            💡 You can add funds at any time from your wallet page
          </p>
        </div>
      </div>
    </div>
  `;
}

export default renderPaymentCancel;

