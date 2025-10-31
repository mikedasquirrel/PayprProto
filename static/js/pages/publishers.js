// Publishers List Page
import api from '../api.js';

export async function renderPublishers() {
  const content = document.getElementById('content');

  content.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading publishers...</p>
    </div>
  `;

  try {
    const data = await api.getPublishers({ limit: 100 });
    const publishers = data.items || [];

    content.innerHTML = `
      <div class="container">
        <div class="hero">
          <h1 class="hero-title">All Publishers</h1>
          <p class="hero-subtitle">
            Browse our curated collection of quality journalism sources
          </p>
        </div>

        <div class="grid grid-3" style="padding: 0 1.5rem 3rem;">
          ${publishers.map(pub => `
            <a href="#/p/${pub.slug}" class="card card-clickable">
              ${pub.hero_url ? `
                <img
                  src="${pub.hero_url}"
                  alt="${pub.name}"
                  class="card-cover"
                  loading="lazy"
                />
              ` : ''}
              <h3 class="card-title">${pub.name}</h3>
              <div class="card-meta">
                ${pub.category ? `
                  <span class="chip chip-secondary">${pub.category}</span>
                ` : ''}
                <span>from $${(pub.default_price_cents / 100).toFixed(2)}</span>
              </div>
            </a>
          `).join('')}
        </div>
      </div>
    `;

  } catch (error) {
    console.error('Error loading publishers:', error);
    content.innerHTML = `
      <div class="container">
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h2 class="empty-message">Failed to load publishers</h2>
          <button class="btn btn-primary" onclick="window.location.reload()">
            Try Again
          </button>
        </div>
      </div>
    `;
  }
}

export default renderPublishers;

