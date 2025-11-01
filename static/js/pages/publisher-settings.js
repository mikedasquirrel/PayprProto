// Publisher Settings
import api from '../api.js';
import { showToast } from '../components/toast.js';

export async function renderPublisherSettings() {
  const content = document.getElementById('content');
  
  // Show loading state
  content.innerHTML = `
    <div class="container">
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading settings...</p>
      </div>
    </div>
  `;
  
  try {
    // Fetch current settings
    const settings = await api.get('/publisher/settings');
    renderSettingsForm(settings);
  } catch (error) {
    console.error('Settings load error:', error);
    content.innerHTML = `
      <div class="container">
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h2 class="empty-message">Error Loading Settings</h2>
          <p style="color: var(--smoke); margin-bottom: 2rem;">
            ${error.message || 'Unable to load settings'}
          </p>
          <button class="btn btn-primary" onclick="window.location.hash='#/publisher/console'">
            Back to Console
          </button>
        </div>
      </div>
    `;
  }
}

function renderSettingsForm(settings) {
  const content = document.getElementById('content');
  
  content.innerHTML = `
    <div class="container">
      <div style="max-width: 800px; margin: 0 auto;">
        <div style="margin-bottom: 2rem;">
          <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 0.5rem;">
            Publisher Settings
          </h1>
          <p style="color: var(--smoke);">
            Configure your publication preferences and defaults
          </p>
        </div>

        <div class="card" style="margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">
            Publication Profile
          </h3>
          
          <div style="display: grid; gap: 1.5rem;">
            <div>
              <label style="display: block; color: var(--smoke); font-weight: 600; margin-bottom: 0.5rem;">
                Publication Name
              </label>
              <input 
                type="text" 
                id="pub-name"
                class="input" 
                placeholder="Your Publication"
                value="${escapeHtml(settings.name || '')}"
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
            </div>

            <div>
              <label style="display: block; color: var(--smoke); font-weight: 600; margin-bottom: 0.5rem;">
                Default Article Price
              </label>
              <div style="position: relative;">
                <span style="position: absolute; left: 1rem; top: 0.75rem; color: var(--smoke);">$</span>
                <input 
                  type="number" 
                  id="default-price"
                  class="input" 
                  placeholder="0.99"
                  step="0.01"
                  value="${((settings.default_price_cents || 0) / 100).toFixed(2)}"
                  style="
                    width: 100%;
                    padding: 0.75rem 1rem 0.75rem 2rem;
                    background: var(--glass-bg);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius);
                    color: var(--paper);
                    font-size: 1rem;
                  "
                >
              </div>
            </div>

            <div>
              <label style="display: block; color: var(--smoke); font-weight: 600; margin-bottom: 0.5rem;">
                Accept Author Submissions
              </label>
              <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer;">
                <input 
                  type="checkbox" 
                  id="accept-submissions"
                  ${settings.accepts_submissions ? 'checked' : ''}
                  style="
                    width: 1.25rem;
                    height: 1.25rem;
                    cursor: pointer;
                  "
                >
                <span style="color: var(--fog);">
                  Allow authors to submit content for curation
                </span>
              </label>
            </div>

            <div>
              <label style="display: block; color: var(--smoke); font-weight: 600; margin-bottom: 0.5rem;">
                Default Author Split
              </label>
              <div style="display: flex; align-items: center; gap: 1rem;">
                <input 
                  type="range" 
                  id="author-split"
                  min="0"
                  max="90"
                  value="${(settings.default_author_split_bps || 6000) / 100}"
                  style="flex: 1;"
                >
                <span id="split-value" style="font-weight: 700; color: var(--primary); min-width: 4rem; text-align: right;">
                  ${(settings.default_author_split_bps || 6000) / 100}%
                </span>
              </div>
              <p style="color: var(--smoke); font-size: 0.875rem; margin-top: 0.5rem;">
                Percentage of revenue that goes to authors by default
              </p>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">
            Branding
          </h3>
          
          <div style="display: grid; gap: 1.5rem;">
            <div>
              <label style="display: block; color: var(--smoke); font-weight: 600; margin-bottom: 0.5rem;">
                Logo URL
              </label>
              <input 
                type="url" 
                id="logo-url"
                class="input" 
                placeholder="https://example.com/logo.png"
                value="${escapeHtml(settings.logo_url || '')}"
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
            </div>

            <div>
              <label style="display: block; color: var(--smoke); font-weight: 600; margin-bottom: 0.5rem;">
                Accent Color
              </label>
              <input 
                type="color" 
                id="accent-color"
                value="${settings.accent_color || '#00d9ff'}"
                style="
                  width: 100%;
                  height: 3rem;
                  padding: 0.25rem;
                  background: var(--glass-bg);
                  border: 1px solid var(--glass-border);
                  border-radius: var(--radius);
                  cursor: pointer;
                "
              >
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 1rem; justify-content: center;">
          <button class="btn btn-primary" onclick="window.saveSettings()">
            💾 Save Settings
          </button>
          <button class="btn btn-secondary" onclick="window.location.hash='#/publisher/console'">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Setup event handlers
  const splitSlider = document.getElementById('author-split');
  const splitValue = document.getElementById('split-value');
  
  if (splitSlider && splitValue) {
    splitSlider.addEventListener('input', (e) => {
      splitValue.textContent = `${e.target.value}%`;
    });
  }
  
  window.saveSettings = async () => {
    try {
      const name = document.getElementById('pub-name').value;
      const defaultPrice = parseFloat(document.getElementById('default-price').value);
      const acceptSubmissions = document.getElementById('accept-submissions').checked;
      const authorSplit = parseInt(document.getElementById('author-split').value);
      const logoUrl = document.getElementById('logo-url').value;
      const accentColor = document.getElementById('accent-color').value;
      
      await api.put('/publisher/settings', {
        name,
        default_price_cents: Math.round(defaultPrice * 100),
        accepts_submissions: acceptSubmissions,
        default_author_split_bps: authorSplit * 100,
        logo_url: logoUrl,
        accent_color: accentColor
      });
      
      showToast('Settings saved successfully!', 'success');
      setTimeout(() => window.location.hash = '#/publisher/console', 1000);
    } catch (error) {
      console.error('Save error:', error);
      showToast(error.message || 'Failed to save settings', 'error');
    }
  };
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export default renderPublisherSettings;

