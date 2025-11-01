// Admin Theme Editor - Live theme customization
import api from '../api.js';
import { showToast } from '../components/toast.js';

export async function renderAdminTheme() {
  const content = document.getElementById('content');
  
  content.innerHTML = `
    <div class="container">
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading theme settings...</p>
      </div>
    </div>
  `;

  try {
    const theme = await api.getTheme();
    renderThemeEditor(theme);
  } catch (error) {
    console.error('Theme load error:', error);
    showToast('Failed to load theme settings', 'error');
  }
}

function renderThemeEditor(theme) {
  const content = document.getElementById('content');
  
  content.innerHTML = `
    <div class="admin-theme">
      <div style="max-width: 1200px; margin: 0 auto;">
        <div style="margin-bottom: 2rem;">
          <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 0.5rem;">
            Theme Editor
          </h1>
          <p style="color: var(--smoke);">
            Customize platform colors, fonts, and visual style
          </p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
          <!-- Theme Settings -->
          <div>
            <div class="card" style="margin-bottom: 1.5rem;">
              <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">
                Colors
              </h3>
              
              <div style="display: grid; gap: 1rem;">
                ${createColorInput('Primary Color', 'color-ink', theme.color_ink || '#ffffff')}
                ${createColorInput('Secondary', 'color-ash', theme.color_ash || '#808080')}
                ${createColorInput('Background', 'color-smoke', theme.color_smoke || '#1e1e23')}
                ${createColorInput('Accent', 'color-paper', theme.color_paper || '#00d9ff')}
              </div>
            </div>

            <div class="card" style="margin-bottom: 1.5rem;">
              <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">
                Typography
              </h3>
              
              <div style="display: grid; gap: 1rem;">
                <div>
                  <label style="display: block; color: var(--smoke); font-weight: 600; margin-bottom: 0.5rem;">
                    Body Font
                  </label>
                  <select id="font-body" class="input" style="width: 100%; padding: 0.75rem;">
                    <option value="system-ui">System UI</option>
                    <option value="Inter">Inter</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Georgia">Georgia</option>
                  </select>
                </div>

                <div>
                  <label style="display: block; color: var(--smoke); font-weight: 600; margin-bottom: 0.5rem;">
                    Headline Font
                  </label>
                  <select id="font-headline" class="input" style="width: 100%; padding: 0.75rem;">
                    <option value="system-ui">System UI</option>
                    <option value="Montserrat">Montserrat</option>
                    <option value="Playfair Display">Playfair Display</option>
                    <option value="Merriweather">Merriweather</option>
                  </select>
                </div>

                <div>
                  <label style="display: block; color: var(--smoke); font-weight: 600; margin-bottom: 0.5rem;">
                    Base Font Size
                  </label>
                  <input 
                    type="range" 
                    id="base-font-size"
                    min="14"
                    max="20"
                    value="${theme.base_font_px || 16}"
                    style="width: 100%;"
                  >
                  <span id="font-size-value">${theme.base_font_px || 16}px</span>
                </div>
              </div>
            </div>

            <div class="card">
              <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">
                Border Radius
              </h3>
              
              <input 
                type="range" 
                id="border-radius"
                min="0"
                max="24"
                value="${theme.radius_px || 8}"
                style="width: 100%;"
              >
              <span id="radius-value">${theme.radius_px || 8}px</span>
            </div>
          </div>

          <!-- Live Preview -->
          <div>
            <div class="card" style="position: sticky; top: 2rem;">
              <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">
                Live Preview
              </h3>
              
              <div id="preview" style="padding: 1.5rem; background: var(--glass-bg); border-radius: var(--radius-lg);">
                <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem;">
                  Sample Heading
                </h2>
                <p style="margin-bottom: 1rem; color: var(--fog);">
                  This is sample body text. It demonstrates how your theme will look with different font and color choices.
                </p>
                <button class="btn btn-primary">
                  Sample Button
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem;">
          <button class="btn btn-primary" onclick="window.saveTheme()">
            💾 Save Theme
          </button>
          <button class="btn btn-secondary" onclick="window.resetTheme()">
            🔄 Reset to Default
          </button>
          <button class="btn btn-secondary" onclick="window.location.hash='#/admin/dashboard'">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;
  
  setupThemeEditor();
}

function createColorInput(label, id, value) {
  return `
    <div>
      <label style="display: block; color: var(--smoke); font-weight: 600; margin-bottom: 0.5rem;">
        ${label}
      </label>
      <div style="display: flex; align-items: center; gap: 1rem;">
        <input 
          type="color" 
          id="${id}"
          value="${value}"
          style="
            width: 4rem;
            height: 3rem;
            border: 1px solid var(--glass-border);
            border-radius: var(--radius);
            cursor: pointer;
          "
        >
        <input 
          type="text" 
          value="${value}"
          readonly
          style="
            flex: 1;
            padding: 0.75rem;
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: var(--radius);
            color: var(--paper);
            font-family: monospace;
          "
        >
      </div>
    </div>
  `;
}

function setupThemeEditor() {
  // Font size slider
  const fontSizeSlider = document.getElementById('base-font-size');
  const fontSizeValue = document.getElementById('font-size-value');
  if (fontSizeSlider && fontSizeValue) {
    fontSizeSlider.addEventListener('input', (e) => {
      fontSizeValue.textContent = `${e.target.value}px`;
    });
  }
  
  // Radius slider
  const radiusSlider = document.getElementById('border-radius');
  const radiusValue = document.getElementById('radius-value');
  if (radiusSlider && radiusValue) {
    radiusSlider.addEventListener('input', (e) => {
      radiusValue.textContent = `${e.target.value}px`;
    });
  }
  
  window.saveTheme = async () => {
    try {
      const themeData = {
        color_ink: document.getElementById('color-ink')?.value,
        color_ash: document.getElementById('color-ash')?.value,
        color_smoke: document.getElementById('color-smoke')?.value,
        color_paper: document.getElementById('color-paper')?.value,
        font_body: document.getElementById('font-body')?.value,
        font_headline: document.getElementById('font-headline')?.value,
        base_font_px: parseInt(document.getElementById('base-font-size')?.value),
        radius_px: parseInt(document.getElementById('border-radius')?.value)
      };
      
      await api.updateTheme(themeData);
      showToast('Theme saved successfully!', 'success');
      
      // Reload page to apply theme
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      showToast('Failed to save theme', 'error');
    }
  };
  
  window.resetTheme = () => {
    if (confirm('Reset theme to default settings?')) {
      showToast('Theme reset', 'success');
      setTimeout(() => window.location.reload(), 1000);
    }
  };
}

export default renderAdminTheme;

