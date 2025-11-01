// Publisher Content Management - Manage articles and curate author content
import api from '../api.js';
import { showToast } from '../components/toast.js';

export async function renderPublisherContent() {
  const content = document.getElementById('content');
  
  content.innerHTML = `
    <div class="container">
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading content...</p>
      </div>
    </div>
  `;

  try {
    // Fetch publisher's articles and available content
    const articles = await api.getPublisherArticles();
    const availableContent = await api.get('/publisher/available-content');
    
    renderContentManager(articles, availableContent);
    
  } catch (error) {
    console.error('Content load error:', error);
    
    content.innerHTML = `
      <div class="container">
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h2 class="empty-message">Error Loading Content</h2>
          <p style="color: var(--smoke); margin-bottom: 2rem;">
            ${error.message || 'Unable to load content'}
          </p>
          <button class="btn btn-primary" onclick="window.location.hash='#/publisher/console'">
            Back to Console
          </button>
        </div>
      </div>
    `;
  }
}

function renderContentManager(articles, availableContent) {
  const content = document.getElementById('content');
  
  content.innerHTML = `
    <div class="publisher-content">
      <div style="margin-bottom: 2rem;">
        <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 0.5rem;">
          Content Management
        </h1>
        <p style="color: var(--smoke);">
          Manage your published articles and curate author submissions
        </p>
      </div>

      <!-- Content Tabs -->
      <div class="content-tabs" style="display: flex; gap: 0.5rem; margin-bottom: 2rem; border-bottom: 2px solid var(--glass-border);">
        <button class="content-tab active" data-tab="published">
          Published Articles (${articles.items?.length || 0})
        </button>
        <button class="content-tab" data-tab="available">
          Available from Authors (${availableContent.items?.length || 0})
        </button>
      </div>

      <!-- Published Articles Section -->
      <div class="tab-content published-section">
        <div class="card">
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">
            Your Published Articles
          </h3>
          
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1px solid var(--glass-border);">
                  <th style="text-align: left; padding: 0.75rem; color: var(--smoke); font-weight: 600; font-size: 0.875rem;">Title</th>
                  <th style="text-align: left; padding: 0.75rem; color: var(--smoke); font-weight: 600; font-size: 0.875rem;">Author</th>
                  <th style="text-align: right; padding: 0.75rem; color: var(--smoke); font-weight: 600; font-size: 0.875rem;">Price</th>
                  <th style="text-align: right; padding: 0.75rem; color: var(--smoke); font-weight: 600; font-size: 0.875rem;">Unlocks</th>
                  <th style="text-align: center; padding: 0.75rem; color: var(--smoke); font-weight: 600; font-size: 0.875rem;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${articles.items && articles.items.length > 0 ? articles.items.map(article => `
                  <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                    <td style="padding: 1rem;">
                      <div style="font-weight: 600;">${escapeHtml(article.title)}</div>
                      <div style="font-size: 0.75rem; color: var(--smoke);">
                        ${article.status === 'published' ? '✓ Published' : '⏸ Draft'}
                      </div>
                    </td>
                    <td style="padding: 1rem; color: var(--fog);">
                      ${escapeHtml(article.author || 'Unknown')}
                    </td>
                    <td style="padding: 1rem; text-align: right; font-weight: 600;">
                      $${(article.price_cents / 100).toFixed(2)}
                    </td>
                    <td style="padding: 1rem; text-align: right; color: var(--primary);">
                      ${article.unlock_count || 0}
                    </td>
                    <td style="padding: 1rem; text-align: center;">
                      <button class="btn-sm btn-secondary" onclick="window.viewArticle(${article.id})">
                        View
                      </button>
                    </td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="5" style="padding: 2rem; text-align: center; color: var(--smoke);">
                      No published articles yet
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Available Content Section -->
      <div class="tab-content available-section" style="display: none;">
        <div class="card">
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">
            Available Content from Authors
          </h3>
          
          <div style="display: grid; gap: 1rem;">
            ${availableContent.items && availableContent.items.length > 0 ? availableContent.items.map(article => `
              <div class="article-preview" style="
                background: var(--glass-bg);
                border: 1px solid var(--glass-border);
                border-radius: var(--radius-lg);
                padding: 1.5rem;
                display: flex;
                justify-content: space-between;
                align-items: start;
                gap: 1.5rem;
              ">
                <div style="flex: 1;">
                  <h4 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 0.5rem;">
                    ${escapeHtml(article.title)}
                  </h4>
                  <p style="color: var(--fog); font-size: 0.875rem; margin-bottom: 0.75rem;">
                    ${escapeHtml(article.dek || 'No description')}
                  </p>
                  <div style="display: flex; gap: 1rem; font-size: 0.875rem; color: var(--smoke);">
                    <span>👤 ${escapeHtml(article.author_name || 'Unknown Author')}</span>
                    <span>💰 $${(article.price_cents / 100).toFixed(2)}</span>
                    <span>📅 ${new Date(article.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                  <button 
                    class="btn-sm btn-primary" 
                    onclick="window.addToCatalog(${article.id})"
                  >
                    ➕ Add to Catalog
                  </button>
                  <button 
                    class="btn-sm btn-secondary" 
                    onclick="window.previewContent(${article.id})"
                  >
                    👁 Preview
                  </button>
                </div>
              </div>
            `).join('') : `
              <div style="padding: 3rem; text-align: center; color: var(--smoke);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                <p>No available content from authors yet</p>
              </div>
            `}
          </div>
        </div>
      </div>

      <div style="text-align: center; margin-top: 2rem;">
        <button class="btn btn-secondary" onclick="window.location.hash='#/publisher/console'">
          ← Back to Console
        </button>
      </div>
    </div>
  `;
  
  setupEventHandlers();
}

function setupEventHandlers() {
  // Tab switching
  const tabs = document.querySelectorAll('.content-tab');
  const publishedSection = document.querySelector('.published-section');
  const availableSection = document.querySelector('.available-section');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      if (tab.dataset.tab === 'published') {
        publishedSection.style.display = 'block';
        availableSection.style.display = 'none';
      } else {
        publishedSection.style.display = 'none';
        availableSection.style.display = 'block';
      }
    });
  });
  
  // Global functions for actions
  window.viewArticle = (articleId) => {
    window.location.hash = `#/article/${articleId}`;
  };
  
  window.addToCatalog = async (articleId) => {
    try {
      await api.post(`/publisher/add-content/${articleId}`, {});
      showToast('Content added to your catalog!', 'success');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      showToast(error.message || 'Failed to add content', 'error');
    }
  };
  
  window.previewContent = (articleId) => {
    window.location.hash = `#/article/${articleId}`;
  };
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export default renderPublisherContent;

