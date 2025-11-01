// Publications Showcase Page - News rack style display of publications using Paypr
import api from '../api.js';

export async function renderPublications() {
  const content = document.getElementById('content');

  // Show loading state
  content.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading publications...</p>
    </div>
  `;

  try {
    const response = await fetch('/api/publications-showcase');
    const data = await response.json();
    const publications = data.publications || [];

    // Get unique categories
    const categories = ['All', ...new Set(publications.map(p => p.category))];

    content.innerHTML = `
      <div class="platform-page">
        <!-- Hero Section -->
        <div class="platform-hero">
          <div class="container">
            <h1 class="platform-hero-title">
              <span class="text-gradient">500+ Publications</span> Trust Paypr
            </h1>
            <p class="platform-hero-subtitle">
              Leading publishers around the world use Paypr to monetize quality content
              and reach readers beyond subscription paywalls.
            </p>
          </div>
        </div>

        <!-- Stats Section -->
        <div class="publications-stats">
          <div class="container">
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-number">500+</div>
                <div class="stat-label">Publications</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">2.4M+</div>
                <div class="stat-label">Articles</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">240%</div>
                <div class="stat-label">Avg. Revenue Growth</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">15M+</div>
                <div class="stat-label">Monthly Readers</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter Section -->
        <div class="container">
          <div class="publications-filter-section">
            <h2 class="section-title">Featured Publications</h2>
            <div class="filter-chips-container">
              ${categories.map((cat, idx) => `
                <button 
                  class="filter-chip ${idx === 0 ? 'active' : ''}" 
                  data-category="${cat}"
                  onclick="window.filterPublications('${cat}')"
                >
                  ${cat}
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Publications Rack -->
        <div class="container">
          <div class="news-rack" id="publications-rack">
            ${renderPublicationsRack(publications)}
          </div>
        </div>

        <!-- Testimonials Section -->
        <div class="platform-testimonials">
          <div class="container">
            <h2 class="section-title" style="margin-bottom: 3rem;">What Publishers Say</h2>
            <div class="testimonials-grid">
              ${publications.slice(0, 3).map(pub => `
                <div class="testimonial-card">
                  <div class="testimonial-quote">"${pub.quote}"</div>
                  <div class="testimonial-author">
                    <div class="testimonial-logo">${pub.logo}</div>
                    <div>
                      <div class="testimonial-name">${pub.name}</div>
                      <div class="testimonial-role">${pub.category}</div>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- CTA Section -->
        <div class="platform-cta-section">
          <div class="container">
            <h2 style="font-size: 2rem; margin-bottom: 1rem;">Join These Publishers</h2>
            <p style="color: var(--fog); margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto;">
              Start monetizing your content with Paypr's micropayment platform.
              No subscriptions required. Fair revenue sharing. Happy readers.
            </p>
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
              <a href="#/platform" class="btn btn-primary btn-lg">Learn More</a>
              <a href="#/contact" class="btn btn-outline btn-lg">Contact Sales</a>
            </div>
          </div>
        </div>
      </div>
    `;

    // Setup filter functionality
    setupPublicationsFilter(publications);

  } catch (error) {
    console.error('Error loading publications:', error);
    content.innerHTML = `
      <div class="container">
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h2 class="empty-message">Failed to load publications</h2>
          <button class="btn btn-primary" onclick="window.location.reload()">
            Try Again
          </button>
        </div>
      </div>
    `;
  }
}

function renderPublicationsRack(publications) {
  if (publications.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon">📰</div>
        <p class="empty-message">No publications found</p>
      </div>
    `;
  }

  return publications.map(pub => `
    <div class="publication-magazine" data-category="${pub.category}">
      <div class="publication-spine" style="background: ${pub.accent_color}"></div>
      <div class="publication-cover" style="background: linear-gradient(135deg, ${pub.accent_color}22, ${pub.accent_color}44)">
        <div class="publication-logo">${pub.logo}</div>
        <div class="publication-name">${pub.name}</div>
        <div class="publication-category">${pub.category}</div>
        <div class="publication-stats">
          <div class="publication-stat">
            <strong>${pub.article_count.toLocaleString()}</strong>
            <span>articles</span>
          </div>
          <div class="publication-stat">
            <strong>Since ${pub.since_year}</strong>
            <span>on Paypr</span>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function setupPublicationsFilter(allPublications) {
  window.filterPublications = (category) => {
    const rack = document.getElementById('publications-rack');
    const chips = document.querySelectorAll('.filter-chip');
    
    // Update active chip
    chips.forEach(chip => {
      if (chip.dataset.category === category) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    // Filter publications
    let filtered = allPublications;
    if (category !== 'All') {
      filtered = allPublications.filter(p => p.category === category);
    }

    // Re-render rack
    rack.innerHTML = renderPublicationsRack(filtered);
  };
}

export default renderPublications;

