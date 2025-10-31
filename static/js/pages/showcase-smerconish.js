// Smerconish.com Showcase Page
import auth from '../auth.js';
import { showToast } from '../components/toast.js';

export async function renderSmerconishShowcase() {
  const content = document.getElementById('content');
  const navbar = document.getElementById('navbar');
  
  // Load custom CSS
  loadShowcaseCSS();
  
  // Hide main navbar
  navbar.style.display = 'none';
  
  // Show loading
  content.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading Smerconish.com...</p>
    </div>
  `;

  try {
    // Fetch showcase data
    const [siteResponse, contentResponse, statsResponse] = await Promise.all([
      fetch('/showcase/smerconish'),
      fetch('/showcase/smerconish/content?limit=50'),
      fetch('/showcase/smerconish/stats')
    ]);

    const site = await siteResponse.json();
    const contentData = await contentResponse.json();
    const stats = await statsResponse.json();
    const articles = contentData.items || [];

    // Group articles by category
    const byCategory = groupByCategory(articles);

    // Render page
    content.innerHTML = `
      <div class="showcase-smerconish">
        <!-- Custom Header -->
        <header class="smer-header">
          <div class="smer-header-content">
            <div class="smer-logo">
              SMER<span>CONISH</span>
            </div>
            <nav class="smer-nav">
              <a href="#/showcase/smerconish">Home</a>
              <a href="#/showcase/smerconish/about">About</a>
              <a href="https://twitter.com/smerconish" target="_blank">Twitter</a>
              <a href="#/">← Back to Paypr</a>
            </nav>
          </div>
        </header>

        <!-- Hero Section -->
        <section class="smer-hero">
          <div class="smer-hero-content">
            <h1 class="smer-hero-title">Michael Smerconish</h1>
            <p class="smer-hero-tagline">Independent Thinking in Politics & Media</p>
            <p class="smer-hero-subtitle">
              CNN • SiriusXM • Attorney • Author
            </p>
            <div class="smer-social-links">
              <a href="#" class="smer-social-link">📺 CNN Saturdays</a>
              <a href="#" class="smer-social-link">🎙️ SiriusXM POTUS</a>
              <a href="#" class="smer-social-link">📧 Newsletter</a>
            </div>
          </div>
        </section>

        <!-- Stats Bar -->
        <div class="smer-content">
          <div class="smer-stats">
            <div class="smer-stat">
              <div class="smer-stat-value">${site.content_count || articles.length}</div>
              <div class="smer-stat-label">Articles</div>
            </div>
            <div class="smer-stat">
              <div class="smer-stat-value">${stats.total_reads || 0}</div>
              <div class="smer-stat-label">Reads</div>
            </div>
            <div class="smer-stat">
              <div class="smer-stat-value">CNN + SiriusXM</div>
              <div class="smer-stat-label">Platforms</div>
            </div>
            <div class="smer-stat">
              <div class="smer-stat-value">Weekly</div>
              <div class="smer-stat-label">New Content</div>
            </div>
          </div>
        </div>

        <!-- Content Sections -->
        <div class="smer-content">
          <!-- CNN Analysis -->
          ${byCategory["CNN"] ? `
            <section style="margin-bottom: 4rem;">
              <h2 class="smer-section-title">CNN Analysis & Commentary</h2>
              <div class="smer-grid">
                ${byCategory["CNN"].map(article => renderArticleCard(article, 'cnn')).join('')}
              </div>
            </section>
          ` : ''}

          <!-- Podcast Episodes -->
          ${byCategory["Podcast"] ? `
            <section style="margin-bottom: 4rem;">
              <h2 class="smer-section-title">SiriusXM Podcast Episodes</h2>
              <div class="smer-grid">
                ${byCategory["Podcast"].map(article => renderArticleCard(article, 'podcast')).join('')}
              </div>
            </section>
          ` : ''}

          <!-- Newsletter Exclusives -->
          ${byCategory["Newsletter Exclusive"] ? `
            <section style="margin-bottom: 4rem;">
              <h2 class="smer-section-title">Newsletter Exclusives</h2>
              <div class="smer-grid">
                ${byCategory["Newsletter Exclusive"].map(article => renderArticleCard(article, 'exclusive')).join('')}
              </div>
            </section>
          ` : ''}

          <!-- All Other Content -->
          ${renderOtherContent(articles, byCategory)}
        </div>

        <!-- Footer -->
        <footer class="smer-footer">
          <div class="smer-footer-content">
            <div class="smer-footer-links">
              <a href="#" class="smer-footer-link">About</a>
              <a href="#" class="smer-footer-link">Contact</a>
              <a href="#" class="smer-footer-link">Privacy</a>
              <a href="#" class="smer-footer-link">Terms</a>
            </div>
            <p class="smer-copyright">
              © ${new Date().getFullYear()} Michael Smerconish. All rights reserved.
            </p>
            ${site.show_paypr_branding ? `
              <div class="smer-paypr-badge">
                Powered by <strong>paypr</strong> - micropayments for quality content
              </div>
            ` : ''}
          </div>
        </footer>
      </div>
    `;

  } catch (error) {
    console.error('Error loading showcase:', error);
    content.innerHTML = `
      <div class="container">
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h2 class="empty-message">Failed to load showcase</h2>
          <p style="color: var(--smoke); margin-bottom: 2rem;">${error.message}</p>
          <button class="btn btn-primary" onclick="window.location.hash='#/'">
            Back to Paypr
          </button>
        </div>
      </div>
    `;
  }
}

export async function renderSmerconishArticle(params) {
  const articleId = params.id;
  const content = document.getElementById('content');
  const navbar = document.getElementById('navbar');
  
  // Load custom CSS
  loadShowcaseCSS();
  
  // Hide main navbar
  navbar.style.display = 'none';

  try {
    // Fetch article
    const response = await fetch(`/api/articles/${articleId}`);
    const article = await response.json();

    // Determine category
    let category = 'article';
    let categoryColor = 'cnn';
    if (article.media_type === 'audio') {
      category = 'Podcast';
      categoryColor = 'podcast';
    } else if (!article.publisher) {
      category = 'Newsletter Exclusive';
      categoryColor = 'exclusive';
    } else if (article.publisher && article.publisher.name === 'CNN') {
      category = 'CNN';
      categoryColor = 'cnn';
    }

    content.innerHTML = `
      <div class="showcase-smerconish">
        <!-- Header -->
        <header class="smer-header">
          <div class="smer-header-content">
            <a href="#/showcase/smerconish" class="smer-logo">
              SMER<span>CONISH</span>
            </a>
            <nav class="smer-nav">
              <a href="#/showcase/smerconish">← Back to Articles</a>
              <a href="#/">Paypr Home</a>
            </nav>
          </div>
        </header>

        <!-- Article -->
        <article class="smer-article-detail">
          <header class="smer-article-header">
            <span class="smer-article-category ${categoryColor}">${category}</span>
            <h1 class="smer-article-title">${article.title}</h1>
            <p class="smer-article-dek">${article.dek || ''}</p>
            
            <div class="smer-article-byline">
              <img
                src="https://picsum.photos/seed/smerconish-photo/400/400"
                alt="Michael Smerconish"
                class="smer-author-photo"
              />
              <div class="smer-byline-info">
                <div class="smer-author-name">Michael Smerconish</div>
                <div style="font-size: 0.875rem; color: var(--smer-gray);">
                  ${article.media_type === 'audio' ? '🎧 Audio Content' : '📰 Article'}
                  • $${(article.price_cents / 100).toFixed(2)}
                </div>
              </div>
            </div>
          </header>

          ${article.cover_url ? `
            <img
              src="${article.cover_url}"
              alt="${article.title}"
              style="width: 100%; max-width: 1000px; margin: 0 auto 3rem; display: block; border-radius: 0.5rem;"
            />
          ` : ''}

          <div class="smer-article-content">
            ${article.unlocked ? `
              ${article.body_html || '<p>Article content</p>'}
            ` : `
              ${article.body_preview ? `
                <div style="position: relative;">
                  ${article.body_preview}
                  <div style="
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 300px;
                    background: linear-gradient(to bottom, transparent, var(--smer-white));
                  "></div>
                </div>
              ` : ''}
              
              <div class="smer-paywall">
                <div class="smer-paywall-icon">🔒</div>
                <h2 class="smer-paywall-title">Continue Reading</h2>
                <div class="smer-paywall-price">$${(article.price_cents / 100).toFixed(2)}</div>
                <p style="margin-bottom: 2rem; opacity: 0.9;">
                  Unlock this ${article.media_type === 'audio' ? 'podcast episode' : 'article'} with one click
                </p>
                <button class="smer-unlock-btn" id="unlock-btn" data-article-id="${articleId}">
                  Unlock Now
                </button>
                <p style="margin-top: 1.5rem; font-size: 0.875rem; opacity: 0.8;">
                  💡 10-minute refund available • No subscription required
                </p>
              </div>
            `}
          </div>
        </article>

        <!-- Footer -->
        <footer class="smer-footer">
          <div class="smer-footer-content">
            <p class="smer-copyright">
              © ${new Date().getFullYear()} Michael Smerconish. All rights reserved.
            </p>
            <div class="smer-paypr-badge">
              Powered by <strong>paypr</strong>
            </div>
          </div>
        </footer>
      </div>
    `;

    // Setup unlock button if not unlocked
    if (!article.unlocked) {
      setupUnlockButton(article);
    }

  } catch (error) {
    console.error('Error loading article:', error);
    content.innerHTML = `
      <div class="container">
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h2 class="empty-message">Article not found</h2>
          <button class="btn btn-primary" onclick="window.location.hash='#/showcase/smerconish'">
            Back to Smerconish
          </button>
        </div>
      </div>
    `;
  }
}

function groupByCategory(articles) {
  const groups = {};
  articles.forEach(article => {
    // Determine category
    let category = 'Other';
    if (article.media_type === 'audio') {
      category = 'Podcast';
    } else if (!article.publisher_name) {
      category = 'Newsletter Exclusive';
    } else if (article.publisher_name === 'CNN') {
      category = 'CNN';
    }
    
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(article);
  });
  return groups;
}

function renderArticleCard(article, categoryClass) {
  return `
    <a href="#/showcase/smerconish/article/${article.id}" class="smer-article-card">
      ${article.cover_url ? `
        <img
          src="${article.cover_url}"
          alt="${article.title}"
          class="smer-article-cover"
          loading="lazy"
        />
      ` : ''}
      
      <div class="smer-article-body">
        <span class="smer-article-category ${categoryClass}">
          ${article.media_type === 'audio' ? '🎧 Podcast' : 
            article.publisher_name === 'CNN' ? 'CNN' : 
            'Exclusive'}
        </span>
        
        <h3 class="smer-article-title">${article.title}</h3>
        <p class="smer-article-dek">${truncate(article.dek || '', 120)}</p>
        
        <div class="smer-article-meta">
          <span class="smer-article-price">$${(article.price_cents / 100).toFixed(2)}</span>
          ${article.media_type !== 'html' ? `
            <span class="smer-article-media-badge">${article.media_type}</span>
          ` : ''}
        </div>
      </div>
    </a>
  `;
}

function renderOtherContent(articles, byCategory) {
  const knownCategories = ['CNN', 'Podcast', 'Newsletter Exclusive'];
  const otherArticles = articles.filter(a => {
    const cat = a.media_type === 'audio' ? 'Podcast' :
                !a.publisher_name ? 'Newsletter Exclusive' :
                a.publisher_name === 'CNN' ? 'CNN' : 'Other';
    return !knownCategories.includes(cat);
  });

  if (otherArticles.length === 0) return '';

  return `
    <section style="margin-bottom: 4rem;">
      <h2 class="smer-section-title">More from Michael</h2>
      <div class="smer-grid">
        ${otherArticles.map(article => renderArticleCard(article, 'other')).join('')}
      </div>
    </section>
  `;
}

function loadShowcaseCSS() {
  // Check if already loaded
  if (document.getElementById('smerconish-css')) return;
  
  const link = document.createElement('link');
  link.id = 'smerconish-css';
  link.rel = 'stylesheet';
  link.href = '/static/css/showcase-smerconish.css';
  document.head.appendChild(link);
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

async function setupUnlockButton(article) {
  const unlockBtn = document.getElementById('unlock-btn');
  
  unlockBtn.addEventListener('click', async () => {
    // Check if user is logged in
    if (!auth.isAuthenticated) {
      showToast('Please log in to unlock content', 'info');
      // Show login modal or redirect
      const shouldLogin = confirm('You need to log in to unlock this content. Go to login page?');
      if (shouldLogin) {
        window.location.hash = '#/login';
      }
      return;
    }

    const articleId = parseInt(unlockBtn.dataset.articleId, 10);
    
    // Check wallet balance
    const walletBalance = auth.getWalletBalance();
    if (walletBalance < article.price_cents) {
      showToast(`Insufficient balance. You need $${(article.price_cents / 100).toFixed(2)}`, 'error');
      const shouldTopup = confirm('Not enough balance. Would you like to add funds?');
      if (shouldTopup) {
        window.location.hash = '#/wallet';
      }
      return;
    }

    // Disable button
    unlockBtn.disabled = true;
    unlockBtn.textContent = 'Processing...';

    try {
      // Make payment using API
      const response = await fetch('/api/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ article_id: articleId })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Payment failed');
      }

      // Update wallet balance
      auth.updateWalletBalance(result.balance_cents);

      // Show success with split breakdown
      const splitInfo = Object.entries(result.split || {})
        .map(([role, cents]) => `${role}: $${(cents / 100).toFixed(2)}`)
        .join(' | ');
      
      showToast(`Unlocked! ${splitInfo}`, 'success', 4000);

      // Reload page to show unlocked content
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Payment error:', error);
      showToast(error.message || 'Payment failed', 'error');
      unlockBtn.disabled = false;
      unlockBtn.textContent = 'Unlock Now';
    }
  });
}

export default renderSmerconishShowcase;

