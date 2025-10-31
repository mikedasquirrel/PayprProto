// Publisher Page - Individual publisher with articles
import api from '../api.js';
import { showToast } from '../components/toast.js';

export async function renderPublisher(params) {
  const slug = params.slug;
  const content = document.getElementById('content');

  if (!slug) {
    content.innerHTML = '<div class="container"><p>Publisher not found</p></div>';
    return;
  }

  // Show loading
  content.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading publisher...</p>
    </div>
  `;

  try {
    // Fetch publisher and their articles
    const [publisher, articlesData] = await Promise.all([
      api.getPublisher(slug),
      api.getArticles({ publisher: slug, limit: 50 })
    ]);

    const articles = articlesData.items || [];

    content.innerHTML = `
      <div>
        <div class="publisher-header" style="
          background: linear-gradient(135deg, rgba(250, 61, 127, 0.1), rgba(160, 91, 255, 0.1));
          ${publisher.hero_url ? `background-image: url('${publisher.hero_url}');` : ''}
          background-size: cover;
          background-position: center;
        ">
          <div class="publisher-info">
            <h1 class="publisher-name">${publisher.name}</h1>
            ${publisher.strapline ? `
              <p class="publisher-strapline">${publisher.strapline}</p>
            ` : ''}
            <div class="publisher-stats">
              <span>${publisher.article_count || articles.length} articles</span>
              ${publisher.category ? `
                <span>•</span>
                <span class="chip chip-secondary">${publisher.category}</span>
              ` : ''}
              ${publisher.default_price_cents ? `
                <span>•</span>
                <span>from $${(publisher.default_price_cents / 100).toFixed(2)}</span>
              ` : ''}
            </div>
          </div>
        </div>

        <div class="container" style="padding: 3rem 1.5rem;">
          <h2 style="font-size: 1.875rem; font-weight: 700; margin-bottom: 2rem;">
            Latest Articles
          </h2>

          ${articles.length === 0 ? `
            <div class="empty-state">
              <div class="empty-icon">📝</div>
              <p class="empty-message">No articles yet</p>
            </div>
          ` : `
            <div class="grid grid-3">
              ${articles.map(article => renderArticleCard(article)).join('')}
            </div>
          `}
        </div>
      </div>
    `;

  } catch (error) {
    console.error('Error loading publisher:', error);
    content.innerHTML = `
      <div class="container">
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h2 class="empty-message">Publisher not found</h2>
          <p style="color: var(--smoke); margin-bottom: 2rem;">
            ${error.message}
          </p>
          <button class="btn btn-primary" onclick="window.location.hash='#/'">
            Back to Newsstand
          </button>
        </div>
      </div>
    `;
  }
}

function renderArticleCard(article) {
  return `
    <a href="#/article/${article.id}" class="card card-clickable">
      ${article.cover_url ? `
        <img
          src="${article.cover_url}"
          alt="${article.title}"
          class="card-cover"
          loading="lazy"
        />
      ` : ''}
      
      <h3 class="card-title">${article.title}</h3>
      
      ${article.dek ? `
        <p class="card-dek">${truncate(article.dek, 120)}</p>
      ` : ''}
      
      <div class="card-meta">
        ${article.author ? `<span>${article.author}</span>` : ''}
        <span class="chip chip-primary">$${(article.price_cents / 100).toFixed(2)}</span>
        ${article.media_type !== 'html' ? `
          <span class="chip">${article.media_type.toUpperCase()}</span>
        ` : ''}
      </div>
    </a>
  `;
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

export default renderPublisher;

