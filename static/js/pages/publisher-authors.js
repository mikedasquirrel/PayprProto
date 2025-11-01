// Publisher Authors Management
import api from '../api.js';
import { showToast } from '../components/toast.js';

export async function renderPublisherAuthors() {
  const content = document.getElementById('content');
  
  content.innerHTML = `
    <div class="container">
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading authors...</p>
      </div>
    </div>
  `;

  try {
    const authors = await api.get('/publisher/authors');
    
    renderAuthorsPage(authors);
    
  } catch (error) {
    console.error('Authors load error:', error);
    
    content.innerHTML = `
      <div class="container">
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h2 class="empty-message">Error Loading Authors</h2>
          <p style="color: var(--smoke); margin-bottom: 2rem;">
            ${error.message || 'Unable to load authors'}
          </p>
          <button class="btn btn-primary" onclick="window.location.hash='#/publisher/console'">
            Back to Console
          </button>
        </div>
      </div>
    `;
  }
}

function renderAuthorsPage(authors) {
  const content = document.getElementById('content');
  
  content.innerHTML = `
    <div class="publisher-authors">
      <div style="margin-bottom: 2rem;">
        <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 0.5rem;">
          Author Relationships
        </h1>
        <p style="color: var(--smoke);">
          Manage authors and configure revenue splits
        </p>
      </div>

      <div class="card" style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">
          Working Authors
        </h3>
        
        ${authors.items && authors.items.length > 0 ? `
          <div style="display: grid; gap: 1rem;">
            ${authors.items.map(author => `
              <div style="
                background: var(--glass-bg);
                border: 1px solid var(--glass-border);
                border-radius: var(--radius-lg);
                padding: 1.5rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
              ">
                <div>
                  <h4 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 0.25rem;">
                    ${escapeHtml(author.display_name || 'Unknown Author')}
                  </h4>
                  <p style="color: var(--fog); font-size: 0.875rem; margin-bottom: 0.5rem;">
                    ${escapeHtml(author.bio || 'No bio available')}
                  </p>
                  <div style="display: flex; gap: 1rem; font-size: 0.875rem; color: var(--smoke);">
                    <span>📝 ${author.article_count || 0} articles</span>
                    <span>💰 $${((author.total_earnings_cents || 0) / 100).toFixed(2)} earned</span>
                    <span>🤝 ${author.split_percent || 60}% revenue split</span>
                  </div>
                </div>
                <button class="btn-sm btn-secondary" onclick="window.viewAuthorDetails(${author.id})">
                  View Details
                </button>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="padding: 3rem; text-align: center; color: var(--smoke);">
            <div style="font-size: 3rem; margin-bottom: 1rem;">👥</div>
            <p>No author relationships yet</p>
            <p style="font-size: 0.875rem; margin-top: 0.5rem;">
              Authors will appear here when they submit content to your publication
            </p>
          </div>
        `}
      </div>

      <div style="text-align: center;">
        <button class="btn btn-secondary" onclick="window.location.hash='#/publisher/console'">
          ← Back to Console
        </button>
      </div>
    </div>
  `;
  
  window.viewAuthorDetails = (authorId) => {
    showToast('Author detail view coming soon', 'info');
  };
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export default renderPublisherAuthors;

