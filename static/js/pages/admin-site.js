// Admin Site Settings
import api from '../api.js';
import { showToast } from '../components/toast.js';

export async function renderAdminSite() {
  const content = document.getElementById('content');
  
  content.innerHTML = `
    <div class="container">
      <div style="max-width: 800px; margin: 0 auto;">
        <div style="margin-bottom: 2rem;">
          <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 0.5rem;">
            Site Settings
          </h1>
          <p style="color: var(--smoke);">
            Configure platform-wide settings and features
          </p>
        </div>

        <div class="card" style="margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">
            Platform Configuration
          </h3>
          
          <div style="display: grid; gap: 1.5rem;">
            <div>
              <label style="display: block; color: var(--smoke); font-weight: 600; margin-bottom: 0.5rem;">
                Platform Fee (%)
              </label>
              <input 
                type="number" 
                id="platform-fee"
                value="10"
                step="0.1"
                min="0"
                max="30"
                style="
                  width: 100%;
                  padding: 0.75rem 1rem;
                  background: var(--glass-bg);
                  border: 1px solid var(--glass-border);
                  border-radius: var(--radius);
                  color: var(--paper);
                  font-size: 1rem;
                "
              >
              <p style="color: var(--smoke); font-size: 0.875rem; margin-top: 0.5rem;">
                Percentage taken from each transaction
              </p>
            </div>

            <div>
              <label style="display: block; color: var(--smoke); font-weight: 600; margin-bottom: 0.5rem;">
                Daily Spending Cap ($)
              </label>
              <input 
                type="number" 
                id="spend-cap"
                value="15"
                step="1"
                min="5"
                max="100"
                style="
                  width: 100%;
                  padding: 0.75rem 1rem;
                  background: var(--glass-bg);
                  border: 1px solid var(--glass-border);
                  border-radius: var(--radius);
                  color: var(--paper);
                  font-size: 1rem;
                "
              >
              <p style="color: var(--smoke); font-size: 0.875rem; margin-top: 0.5rem;">
                Maximum amount a user can spend per day
              </p>
            </div>

            <div>
              <label style="display: block; color: var(--smoke); font-weight: 600; margin-bottom: 0.5rem;">
                Refund Window (minutes)
              </label>
              <input 
                type="number" 
                id="refund-window"
                value="10"
                min="5"
                max="60"
                style="
                  width: 100%;
                  padding: 0.75rem 1rem;
                  background: var(--glass-bg);
                  border: 1px solid var(--glass-border);
                  border-radius: var(--radius);
                  color: var(--paper);
                  font-size: 1rem;
                "
              >
              <p style="color: var(--smoke); font-size: 0.875rem; margin-top: 0.5rem;">
                Time window for users to request refunds
              </p>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">
            Features
          </h3>
          
          <div style="display: grid; gap: 1rem;">
            <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer;">
              <input type="checkbox" id="feature-showcase" checked style="width: 1.25rem; height: 1.25rem;">
              <div>
                <div style="font-weight: 600;">Showcase Sites</div>
                <div style="color: var(--smoke); font-size: 0.875rem;">Enable branded showcase sites for authors</div>
              </div>
            </label>

            <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer;">
              <input type="checkbox" id="feature-author" checked style="width: 1.25rem; height: 1.25rem;">
              <div>
                <div style="font-weight: 600;">Author Marketplace</div>
                <div style="color: var(--smoke); font-size: 0.875rem;">Allow authors to submit content directly</div>
              </div>
            </label>

            <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer;">
              <input type="checkbox" id="feature-magic-link" checked style="width: 1.25rem; height: 1.25rem;">
              <div>
                <div style="font-weight: 600;">Magic Link Login</div>
                <div style="color: var(--smoke); font-size: 0.875rem;">Enable passwordless email login</div>
              </div>
            </label>

            <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer;">
              <input type="checkbox" id="feature-stripe" checked style="width: 1.25rem; height: 1.25rem;">
              <div>
                <div style="font-weight: 600;">Stripe Checkout</div>
                <div style="color: var(--smoke); font-size: 0.875rem;">Enable Stripe payment processing</div>
              </div>
            </label>
          </div>
        </div>

        <div class="card" style="margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">
            Maintenance
          </h3>
          
          <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer;">
            <input type="checkbox" id="maintenance-mode" style="width: 1.25rem; height: 1.25rem;">
            <div>
              <div style="font-weight: 600; color: var(--error);">Maintenance Mode</div>
              <div style="color: var(--smoke); font-size: 0.875rem;">Temporarily disable public access</div>
            </div>
          </label>
        </div>

        <div style="display: flex; gap: 1rem; justify-content: center;">
          <button class="btn btn-primary" onclick="window.saveSiteSettings()">
            💾 Save Settings
          </button>
          <button class="btn btn-secondary" onclick="window.location.hash='#/admin/dashboard'">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;
  
  window.saveSiteSettings = async () => {
    try {
      const settings = {
        platform_fee_bps: parseFloat(document.getElementById('platform-fee')?.value) * 100,
        daily_spend_cap_cents: parseFloat(document.getElementById('spend-cap')?.value) * 100,
        refund_window_minutes: parseInt(document.getElementById('refund-window')?.value),
        feature_showcase: document.getElementById('feature-showcase')?.checked,
        feature_author: document.getElementById('feature-author')?.checked,
        feature_magic_link: document.getElementById('feature-magic-link')?.checked,
        feature_stripe: document.getElementById('feature-stripe')?.checked,
        maintenance_mode: document.getElementById('maintenance-mode')?.checked
      };
      
      await api.put('/admin/site', settings);
      showToast('Settings saved successfully!', 'success');
    } catch (error) {
      showToast('Failed to save settings', 'error');
    }
  };
}

export default renderAdminSite;

