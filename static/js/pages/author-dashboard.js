// Author Dashboard - Earnings and content management
import api from '../api.js';
import auth from '../auth.js';
import router from '../router.js';
import { showToast } from '../components/toast.js';

export async function renderAuthorDashboard() {
  const content = document.getElementById('content');

  if (!auth.isAuthenticated) {
    router.navigate('/login');
    return;
  }

  content.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading dashboard...</p>
    </div>
  `;

  try {
    // Check if user has author profile
    let authorProfile;
    try {
      authorProfile = await api.getAuthorProfile();
    } catch (error) {
      // No author profile - show registration
      content.innerHTML = `
        <div class="container" style="max-width: 600px; padding: 3rem 1.5rem;">
          <div class="card">
            <div style="text-align: center; margin-bottom: 2rem;">
              <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 1rem;">
                Become an Author
              </h1>
              <p style="color: var(--fog);">
                Create and publish your own content, set your own prices, and earn revenue
              </p>
            </div>

            <form id="author-register-form">
              <div class="form-group">
                <label class="form-label" for="display_name">Display Name</label>
                <input
                  type="text"
                  id="display_name"
                  name="display_name"
                  class="form-input"
                  placeholder="Your name as it will appear"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="bio">Bio (optional)</label>
                <textarea
                  id="bio"
                  name="bio"
                  class="form-input"
                  placeholder="Tell readers about yourself..."
                  rows="4"
                ></textarea>
              </div>

              <div class="form-group">
                <label class="form-label" for="default_price_cents">Default Article Price</label>
                <select id="default_price_cents" name="default_price_cents" class="form-input">
                  <option value="99">$0.99</option>
                  <option value="149">$1.49</option>
                  <option value="199" selected>$1.99</option>
                  <option value="299">$2.99</option>
                  <option value="499">$4.99</option>
                </select>
              </div>

              <button type="submit" class="btn btn-primary" style="width: 100%;">
                Create Author Profile
              </button>
            </form>
          </div>
        </div>
      `;

      setupRegistrationForm();
      return;
    }

    // User has author profile - fetch earnings and content
    const [earnings, content] = await Promise.all([
      api.getAuthorEarnings(),
      api.getAuthorContent()
    ]);

    const articles = content.articles || [];

    // Render dashboard
    content.innerHTML = `
      <div class="container" style="max-width: 1200px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
          <h1 style="font-size: 2.25rem; font-weight: 800;">
            Author Dashboard
          </h1>
          <a href="#/author/submit" class="btn btn-primary">
            ✍️ New Article
          </a>
        </div>

        <!-- Earnings Overview -->
        <div class="grid grid-3" style="margin-bottom: 3rem;">
          <div class="card">
            <div style="color: var(--smoke); font-size: 0.875rem; margin-bottom: 0.5rem;">Total Earnings</div>
            <div style="font-size: 2.5rem; font-weight: 800; background: var(--grad-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
              $${((earnings.total_earnings_cents || 0) / 100).toFixed(2)}
            </div>
          </div>
          
          <div class="card">
            <div style="color: var(--smoke); font-size: 0.875rem; margin-bottom: 0.5rem;">Last 30 Days</div>
            <div style="font-size: 2.5rem; font-weight: 800; color: var(--accent-tertiary);">
              $${((earnings.last_30_days_cents || 0) / 100).toFixed(2)}
            </div>
          </div>
          
          <div class="card">
            <div style="color: var(--smoke); font-size: 0.875rem; margin-bottom: 0.5rem;">Published Articles</div>
            <div style="font-size: 2.5rem; font-weight: 800; color: var(--accent-secondary);">
              ${articles.filter(a => a.status === 'published').length}
            </div>
          </div>
        </div>

        <!-- Top Performing Articles -->
        ${earnings.top_articles && earnings.top_articles.length > 0 ? `
          <div class="card" style="margin-bottom: 3rem;">
            <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem;">
              Top Performing Articles
            </h2>
            <div style="display: grid; gap: 1rem;">
              ${earnings.top_articles.map(article => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--ash); border-radius: var(--radius);">
                  <div style="flex: 1;">
                    <div style="font-weight: 600; margin-bottom: 0.25rem;">${article.title}</div>
                    <div style="font-size: 0.875rem; color: var(--smoke);">
                      ${article.sales} sales
                    </div>
                  </div>
                  <div style="font-size: 1.25rem; font-weight: 700; color: var(--accent-tertiary);">
                    $${(article.earnings_cents / 100).toFixed(2)}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Your Content -->
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h2 style="font-size: 1.5rem; font-weight: 700;">Your Content</h2>
            <div style="display: flex; gap: 0.5rem;">
              <button class="chip filter-status" data-status="">All</button>
              <button class="chip filter-status" data-status="published">Published</button>
              <button class="chip filter-status" data-status="draft">Drafts</button>
            </div>
          </div>

          ${articles.length === 0 ? `
            <div class="empty-state">
              <div class="empty-icon">📝</div>
              <p class="empty-message">No articles yet</p>
              <button class="btn btn-primary" onclick="window.location.hash='#/author/submit'">
                Create Your First Article
              </button>
            </div>
          ` : `
            <div id="articles-list">
              ${renderArticlesList(articles)}
            </div>
          `}
        </div>
      </div>
    `;

    // Setup filter buttons
    const filterBtns = document.querySelectorAll('.filter-status');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const status = btn.dataset.status;
        const articlesList = document.getElementById('articles-list');
        
        articlesList.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
        
        try {
          const data = await api.getAuthorContent(status);
          articlesList.innerHTML = renderArticlesList(data.articles || []);
        } catch (error) {
          showToast('Failed to load articles', 'error');
        }
      });
    });

  } catch (error) {
    console.error('Error loading dashboard:', error);
    content.innerHTML = `
      <div class="container">
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h2 class="empty-message">Failed to load dashboard</h2>
          <button class="btn btn-primary" onclick="window.location.reload()">
            Try Again
          </button>
        </div>
      </div>
    `;
  }
}

function renderArticlesList(articles) {
  return articles.map(article => `
    <div style="display: flex; justify-content: space-between; align-items: start; padding: 1.5rem; border-bottom: 1px solid var(--glass-border);">
      <div style="flex: 1;">
        <div style="display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.5rem;">
          <h3 style="font-weight: 600; font-size: 1.125rem;">${article.title}</h3>
          <span class="chip ${article.status === 'published' ? 'chip-success' : ''}" style="font-size: 0.65rem;">
            ${article.status}
          </span>
          ${article.license_type !== 'independent' ? `
            <span class="chip chip-secondary" style="font-size: 0.65rem;">
              ${article.license_type}
            </span>
          ` : ''}
        </div>
        <div style="color: var(--smoke); font-size: 0.875rem; margin-bottom: 0.75rem;">
          ${article.publisher_name || 'Independent'} • $${(article.price_cents / 100).toFixed(2)}
        </div>
        <div style="display: flex; gap: 1.5rem; font-size: 0.875rem; color: var(--fog);">
          <span>💰 Earned: $${(article.earnings_cents / 100).toFixed(2)}</span>
          <span>📖 Reads: ${article.reads}</span>
          <span>📅 ${new Date(article.created_at).toLocaleDateString()}</span>
        </div>
      </div>
      <div style="display: flex; gap: 0.5rem;">
        <a href="#/article/${article.id}" class="btn btn-sm btn-secondary">View</a>
        <button class="btn btn-sm btn-secondary" data-edit-id="${article.id}">Edit</button>
      </div>
    </div>
  `).join('');
}

function setupRegistrationForm() {
  const form = document.getElementById('author-register-form');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';

    const formData = {
      display_name: form.display_name.value.trim(),
      bio: form.bio.value.trim(),
      default_price_cents: parseInt(form.default_price_cents.value, 10)
    };

    try {
      await api.registerAuthor(formData);
      showToast('Author profile created!', 'success');
      
      // Reload dashboard
      setTimeout(() => {
        renderAuthorDashboard();
      }, 500);

    } catch (error) {
      showToast(error.message || 'Registration failed', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Author Profile';
    }
  });
}

export default renderAuthorDashboard;

