// Newsstand Page - Main landing page
import api from '../api.js';
import { showToast } from '../components/toast.js';

export async function renderNewsstand() {
  const content = document.getElementById('content');
  
  // Show loading state
  content.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading publishers...</p>
    </div>
  `;

  try {
    // Fetch publishers and categories
    const [publishersData, categoriesData] = await Promise.all([
      api.getPublishers({ limit: 60 }),
      api.getCategories()
    ]);

    const publishers = publishersData.items || [];
    const categories = categoriesData.categories || [];

    // Render page
    content.innerHTML = `
      <div class="container">
        <div class="hero">
          <h1 class="hero-title">
            Unlock <span class="text-gradient">Premium Stories</span>
          </h1>
          <p class="hero-subtitle">
            One click. No subscriptions. Pay only for what you read.
          </p>
        </div>

        <div class="newsstand-header">
          <h2 class="newsstand-title">Publishers</h2>
          
          <div class="newsstand-filters">
            <button class="filter-chip active" data-category="">All</button>
            ${categories.map(cat => `
              <button class="filter-chip" data-category="${cat}">${cat}</button>
            `).join('')}
          </div>

          <div class="search-box">
            <input
              type="search"
              id="search-input"
              class="form-input"
              placeholder="Search publishers..."
            />
            <button class="btn btn-secondary" id="search-btn">Search</button>
          </div>
        </div>

        <div class="magazine-rack">
          <div class="rack-shelf" id="publisher-grid">
            ${renderPublisherGrid(publishers)}
          </div>
        </div>

        <div style="text-align: center; padding: 2rem;">
          <button class="btn btn-secondary" id="load-more" style="display: none;">
            Load More
          </button>
        </div>
      </div>
    `;

    // Add event listeners
    setupFilters(categories);
    setupSearch();
    setupLoadMore(publishers.length);
    
  } catch (error) {
    console.error('Error loading newsstand:', error);
    content.innerHTML = `
      <div class="container">
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h2 class="empty-message">Failed to load publishers</h2>
          <p style="color: var(--smoke); margin-bottom: 2rem;">
            ${error.message}
          </p>
          <button class="btn btn-primary" onclick="window.location.reload()">
            Try Again
          </button>
        </div>
      </div>
    `;
  }
}

function renderPublisherGrid(publishers) {
  if (publishers.length === 0) {
    return `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">📰</div>
        <p class="empty-message">No publishers found</p>
      </div>
    `;
  }

  return publishers.map(pub => `
    <a href="#/p/${pub.slug}" class="magazine">
      <div class="magazine-spine" style="background: ${pub.accent_color || 'var(--glass-bg)'}"></div>
      <img
        class="magazine-cover"
        src="${pub.hero_url || '/static/img/placeholder.png'}"
        alt="${pub.name}"
        loading="lazy"
      />
      <div class="magazine-title">${pub.name}</div>
      ${pub.category ? `<div class="chip chip-secondary" style="margin-top: 0.5rem; font-size: 0.65rem;">${pub.category}</div>` : ''}
    </a>
  `).join('');
}

function setupFilters(categories) {
  const filterChips = document.querySelectorAll('.filter-chip');
  const grid = document.getElementById('publisher-grid');

  filterChips.forEach(chip => {
    chip.addEventListener('click', async () => {
      // Update active state
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const category = chip.dataset.category;

      // Show loading
      grid.innerHTML = '<div class="skeleton skeleton-image"></div>'.repeat(8);

      try {
        const params = category ? { category } : {};
        const data = await api.getPublishers({ ...params, limit: 60 });
        grid.innerHTML = renderPublisherGrid(data.items || []);
      } catch (error) {
        showToast('Failed to filter publishers', 'error');
      }
    });
  });
}

function setupSearch() {
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const grid = document.getElementById('publisher-grid');

  const performSearch = async () => {
    const query = searchInput.value.trim();
    
    grid.innerHTML = '<div class="skeleton skeleton-image"></div>'.repeat(8);

    try {
      const params = query ? { q: query } : {};
      const data = await api.getPublishers({ ...params, limit: 60 });
      grid.innerHTML = renderPublisherGrid(data.items || []);
    } catch (error) {
      showToast('Search failed', 'error');
    }
  };

  searchBtn.addEventListener('click', performSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  });
}

function setupLoadMore(currentCount) {
  const loadMoreBtn = document.getElementById('load-more');
  const grid = document.getElementById('publisher-grid');
  
  // Show button if we have results
  if (currentCount > 0) {
    loadMoreBtn.style.display = 'inline-flex';
  }

  let offset = currentCount;

  loadMoreBtn.addEventListener('click', async () => {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Loading...';

    try {
      const data = await api.getPublishers({ offset, limit: 20 });
      const publishers = data.items || [];

      if (publishers.length === 0) {
        showToast('No more publishers to load', 'info');
        loadMoreBtn.style.display = 'none';
        return;
      }

      // Append new publishers
      grid.insertAdjacentHTML('beforeend', renderPublisherGrid(publishers));
      offset += publishers.length;

    } catch (error) {
      showToast('Failed to load more publishers', 'error');
    } finally {
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = 'Load More';
    }
  });
}

export default renderNewsstand;

