// TechPulse Newsletter Showcase
import api from '../api.js';
import auth from '../auth.js';
import { showToast } from '../components/toast.js';

let showcaseData = null;
let articles = [];

export async function renderTechNewsletterShowcase() {
  const content = document.getElementById('content');
  const navbar = document.getElementById('navbar');
  
  // Hide main navbar for showcase
  if (navbar) {
    navbar.style.display = 'none';
  }
  
  // Show loading
  content.innerHTML = `
    <div class="tech-showcase">
      <div class="tech-loading">
        <div class="tech-spinner"></div>
        <p>Loading TechPulse...</p>
      </div>
    </div>
  `;
  
  try {
    // Fetch showcase data
    [showcaseData, articles] = await Promise.all([
      fetch('/showcase/technewsletter').then(r => r.json()),
      fetch('/showcase/technewsletter/content?limit=50').then(r => r.json())
    ]);
    
    renderShowcaseHome();
  } catch (error) {
    console.error('Showcase load error:', error);
    content.innerHTML = `
      <div class="tech-showcase">
        <div style="text-align: center; padding: 5rem 2rem;">
          <h2 style="font-size: 2rem; margin-bottom: 1rem; color: var(--tech-text);">Error Loading Showcase</h2>
          <p style="color: var(--tech-muted); margin-bottom: 2rem;">${error.message}</p>
          <button class="tech-btn-secondary" onclick="window.location.hash='#/'">
            Return to Main Site
          </button>
        </div>
      </div>
    `;
  }
}

function renderShowcaseHome() {
  const content = document.getElementById('content');
  
  content.innerHTML = `
    <div class="tech-showcase">
      <!-- Header -->
      <header class="tech-header">
        <div class="tech-header-inner">
          <a href="#/showcase/technewsletter" class="tech-logo">
            TechPulse
          </a>
          <nav class="tech-nav">
            <a href="#/showcase/technewsletter">Articles</a>
            <a href="#/">← Main Site</a>
          </nav>
        </div>
      </header>
      
      <!-- Hero -->
      <section class="tech-hero">
        <h1>Independent Tech Analysis</h1>
        <p class="tech-tagline">
          No hype. No vendor pitches. Just honest insights about software engineering, 
          AI, and the future of work from someone who's been in the trenches.
        </p>
        
        <div class="tech-author-info">
          <img 
            src="${showcaseData.author.photo_url || 'https://picsum.photos/seed/alex-chen-photo/400/400'}" 
            alt="${showcaseData.author.display_name}"
            class="tech-author-avatar"
          />
          <div class="tech-author-details">
            <h3>${showcaseData.author.display_name}</h3>
            <p>Independent Tech Writer</p>
          </div>
        </div>
      </section>
      
      <!-- Articles Grid -->
      <section class="tech-articles">
        <h2 class="tech-section-title">Latest Articles</h2>
        <div class="tech-grid">
          ${articles.items && articles.items.length > 0 ? articles.items.map(article => `
            <a 
              href="#/showcase/technewsletter/article/${article.id}" 
              class="tech-article-card"
              data-article-id="${article.id}"
            >
              <img 
                src="${article.cover_url || 'https://picsum.photos/seed/tech-' + article.id + '/1200/675'}" 
                alt="${escapeHtml(article.title)}"
                class="tech-article-cover"
              />
              <div class="tech-article-content">
                <div class="tech-article-category">
                  ${getCategoryTag(article)}
                </div>
                <h3 class="tech-article-title">
                  ${escapeHtml(article.title)}
                </h3>
                <p class="tech-article-dek">
                  ${escapeHtml(article.dek || '')}
                </p>
                <div class="tech-article-footer">
                  <span class="tech-article-author">
                    ${escapeHtml(article.author || showcaseData.author.display_name)}
                  </span>
                  <span class="tech-article-price">
                    $${(article.price_cents / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </a>
          `).join('') : `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
              <p style="color: var(--tech-muted);">No articles available yet.</p>
            </div>
          `}
        </div>
      </section>
      
      <!-- About Section -->
      <section class="tech-articles" style="padding-top: 0;">
        <div style="background: var(--tech-dark); border: 1px solid var(--tech-border); border-radius: 12px; padding: 3rem; text-align: center;">
          <h3 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 1rem; color: var(--tech-text);">
            Supporting Independent Tech Journalism
          </h3>
          <p style="color: var(--tech-muted); max-width: 600px; margin: 0 auto 1.5rem; line-height: 1.6;">
            TechPulse is entirely independent. No sponsors, no ads, no affiliate links. 
            <strong style="color: var(--tech-primary);">90% of every payment</strong> goes directly 
            to supporting this work.
          </p>
          <p style="color: var(--tech-muted); font-size: 0.9rem;">
            Powered by <a href="#/" style="color: var(--tech-primary); text-decoration: none;">Paypr</a> 
            – making micropayments work for independent creators
          </p>
        </div>
      </section>
    </div>
  `;
}

export async function renderTechNewsletterArticle(params) {
  const content = document.getElementById('content');
  const navbar = document.getElementById('navbar');
  
  // Hide main navbar
  if (navbar) {
    navbar.style.display = 'none';
  }
  
  const articleId = params.id;
  
  // Show loading
  content.innerHTML = `
    <div class="tech-showcase">
      <div class="tech-loading">
        <div class="tech-spinner"></div>
        <p>Loading article...</p>
      </div>
    </div>
  `;
  
  try {
    // Fetch article
    const article = await api.getArticle(articleId);
    
    // Check if user has access
    const hasAccess = article.user_has_access || false;
    
    renderArticleDetail(article, hasAccess);
  } catch (error) {
    console.error('Article load error:', error);
    content.innerHTML = `
      <div class="tech-showcase">
        <header class="tech-header">
          <div class="tech-header-inner">
            <a href="#/showcase/technewsletter" class="tech-logo">TechPulse</a>
            <nav class="tech-nav">
              <a href="#/showcase/technewsletter">← Back to Articles</a>
            </nav>
          </div>
        </header>
        <div style="text-align: center; padding: 5rem 2rem;">
          <h2 style="font-size: 2rem; margin-bottom: 1rem; color: var(--tech-text);">Article Not Found</h2>
          <p style="color: var(--tech-muted); margin-bottom: 2rem;">${error.message}</p>
          <a href="#/showcase/technewsletter" class="tech-btn-secondary">
            Back to Articles
          </a>
        </div>
      </div>
    `;
  }
}

function renderArticleDetail(article, hasAccess) {
  const content = document.getElementById('content');
  
  const isLoggedIn = auth.isAuthenticated;
  
  content.innerHTML = `
    <div class="tech-showcase">
      <!-- Header -->
      <header class="tech-header">
        <div class="tech-header-inner">
          <a href="#/showcase/technewsletter" class="tech-logo">
            TechPulse
          </a>
          <nav class="tech-nav">
            <a href="#/showcase/technewsletter">← Back to Articles</a>
            ${!isLoggedIn ? '<a href="#/login">Login</a>' : ''}
          </nav>
        </div>
      </header>
      
      <!-- Article -->
      <article class="tech-article-detail">
        <header class="tech-article-detail-header">
          <div class="tech-article-detail-category">
            ${getCategoryTag(article)}
          </div>
          <h1 class="tech-article-detail-title">
            ${escapeHtml(article.title)}
          </h1>
          <p class="tech-article-detail-dek">
            ${escapeHtml(article.dek || '')}
          </p>
          <div class="tech-article-meta">
            <div class="tech-article-meta-item">
              <span>✍️</span>
              <span>${escapeHtml(article.author || 'Alex Chen')}</span>
            </div>
            <div class="tech-article-meta-item">
              <span>💰</span>
              <span>$${(article.price_cents / 100).toFixed(2)}</span>
            </div>
            <div class="tech-article-meta-item">
              <span>🕒</span>
              <span>${formatDate(article.created_at)}</span>
            </div>
          </div>
        </header>
        
        ${hasAccess ? `
          <!-- Full Article -->
          <div class="tech-article-body">
            ${article.body_html}
          </div>
          
          <div style="margin-top: 4rem; padding-top: 2rem; border-top: 1px solid var(--tech-border); text-align: center;">
            <p style="color: var(--tech-muted); margin-bottom: 1rem;">
              Enjoyed this article? Support independent tech journalism.
            </p>
            <a href="#/showcase/technewsletter" class="tech-btn-secondary">
              Read More Articles
            </a>
          </div>
        ` : `
          <!-- Preview + Paywall -->
          <div class="tech-article-body">
            ${article.body_preview || article.body_html.substring(0, 500) + '...'}
          </div>
          
          <div class="tech-paywall">
            <h3>Continue Reading</h3>
            <p>Get full access to this article and support independent tech journalism</p>
            
            <div class="tech-paywall-price">
              $${(article.price_cents / 100).toFixed(2)}
            </div>
            
            <div class="tech-paywall-split">
              <strong>90%</strong> goes to Alex Chen • <strong>10%</strong> platform fee
            </div>
            
            ${isLoggedIn ? `
              <button class="tech-btn" onclick="window.unlockArticle(${article.id})">
                Unlock Full Article
              </button>
              <p style="margin-top: 1.5rem; font-size: 0.9rem; color: var(--tech-muted);">
                10-minute risk-free refund window
              </p>
            ` : `
              <a href="#/login?return=/showcase/technewsletter/article/${article.id}" class="tech-btn">
                Login to Unlock
              </a>
              <p style="margin-top: 1.5rem; font-size: 0.9rem; color: var(--tech-muted);">
                New users get $5 starter credit
              </p>
            `}
          </div>
        `}
      </article>
    </div>
  `;
  
  // Setup unlock functionality
  if (!hasAccess && isLoggedIn) {
    window.unlockArticle = async (articleId) => {
      try {
        const result = await api.payForArticle(articleId);
        showToast('Article unlocked! 90% goes to the author.', 'success');
        // Reload to show full content
        setTimeout(() => window.location.reload(), 500);
      } catch (error) {
        console.error('Payment error:', error);
        if (error.message.includes('Insufficient funds')) {
          showToast('Insufficient wallet balance. Please add funds.', 'error');
          setTimeout(() => window.location.hash = '#/wallet', 1500);
        } else {
          showToast(error.message || 'Payment failed', 'error');
        }
      }
    };
  }
}

function getCategoryTag(article) {
  const title = article.title || '';
  if (title.includes('AI') || title.includes('ChatGPT') || title.includes('10x Engineer')) {
    return 'AI & Development';
  } else if (title.includes('Remote') || title.includes('Startup')) {
    return 'Future of Work';
  } else if (title.includes('Tech Stack') || title.includes('SaaS')) {
    return 'Startup Strategy';
  } else if (title.includes('Pull Request') || title.includes('Developer')) {
    return 'Engineering Culture';
  }
  return 'Analysis';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  if (!dateString) return 'Recently';
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default renderTechNewsletterShowcase;

