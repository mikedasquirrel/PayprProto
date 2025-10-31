// Article Page - Reading view with pay-to-unlock
import api from '../api.js';
import auth from '../auth.js';
import { showToast } from '../components/toast.js';

export async function renderArticle(params) {
  const articleId = params.id;
  const content = document.getElementById('content');

  if (!articleId) {
    content.innerHTML = '<div class="container"><p>Article not found</p></div>';
    return;
  }

  // Show loading state
  content.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading article...</p>
    </div>
  `;

  try {
    const article = await api.getArticle(articleId);

    // Render article
    content.innerHTML = `
      <article class="container">
        <header class="article-header">
          <h1 class="article-title">${article.title}</h1>
          ${article.dek ? `<p class="article-dek">${article.dek}</p>` : ''}
          
          <div class="article-meta">
            ${article.author ? `<span>By ${article.author}</span>` : ''}
            ${article.publisher ? `
              <span>•</span>
              <a href="#/p/${article.publisher.slug}" style="color: var(--accent-secondary);">
                ${article.publisher.name}
              </a>
            ` : ''}
            <span>•</span>
            <span class="chip chip-primary">$${(article.price_cents / 100).toFixed(2)}</span>
            ${article.media_type !== 'html' ? `
              <span class="chip">${article.media_type.toUpperCase()}</span>
            ` : ''}
          </div>
        </header>

        ${article.cover_url ? `
          <img
            src="${article.cover_url}"
            alt="${article.title}"
            class="article-cover"
          />
        ` : ''}

        <div class="article-body">
          ${article.unlocked ? `
            ${article.body_html || '<p>Article content</p>'}
            
            <div class="refund-widget" id="refund-widget" style="display: none;">
              <div>
                <div style="font-weight: 600; margin-bottom: 0.25rem;">Refund Available</div>
                <div style="font-size: 0.875rem; color: var(--smoke);">
                  You can request a refund within 10 minutes
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 1rem;">
                <div class="countdown-timer" id="countdown-timer">10:00</div>
                <button class="btn btn-sm btn-secondary" id="refund-btn">
                  Refund
                </button>
              </div>
            </div>
          ` : `
            ${article.body_preview ? `
              <div style="position: relative;">
                ${article.body_preview}
                <div style="
                  position: absolute;
                  bottom: 0;
                  left: 0;
                  right: 0;
                  height: 200px;
                  background: linear-gradient(to bottom, transparent, var(--ink));
                "></div>
              </div>
            ` : ''}
            
            <div class="article-paywall">
              <div class="paywall-icon">🔒</div>
              <h2 class="paywall-message">Continue Reading</h2>
              <div class="paywall-price">$${(article.price_cents / 100).toFixed(2)}</div>
              <p style="color: var(--smoke); margin-bottom: 2rem;">
                One-time payment to unlock this article forever
              </p>
              <button class="btn btn-lg btn-primary" id="pay-btn" data-article-id="${articleId}">
                Unlock Article
              </button>
              <p style="color: var(--smoke); margin-top: 1rem; font-size: 0.875rem;">
                💡 10-minute refund window available
              </p>
            </div>
          `}
        </div>
      </article>
    `;

    // Add event listeners
    if (article.unlocked) {
      // Already unlocked - check if we should show refund option
      // Note: We'd need transaction ID from the unlock response
      // For now, just show the article
    } else {
      setupPayButton(article);
    }

  } catch (error) {
    console.error('Error loading article:', error);
    content.innerHTML = `
      <div class="container">
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h2 class="empty-message">Article not found</h2>
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

function setupPayButton(article) {
  const payBtn = document.getElementById('pay-btn');
  
  payBtn.addEventListener('click', async () => {
    // Check if user is logged in
    if (!auth.requireAuth()) {
      return;
    }

    const articleId = parseInt(payBtn.dataset.articleId, 10);
    
    // Check wallet balance
    const walletBalance = auth.getWalletBalance();
    if (walletBalance < article.price_cents) {
      showToast(`Insufficient balance. You need $${(article.price_cents / 100).toFixed(2)}`, 'error');
      window.location.hash = '#/wallet';
      return;
    }

    // Disable button
    payBtn.disabled = true;
    const originalText = payBtn.textContent;
    payBtn.textContent = 'Processing...';

    try {
      // Make payment
      const paymentResult = await api.payForArticle(articleId);

      // Update wallet balance
      auth.updateWalletBalance(paymentResult.balance_cents);

      // Show success message
      showToast(`Article unlocked! $${(paymentResult.price_cents / 100).toFixed(2)} charged`, 'success');

      // Reload the article to show full content
      window.location.reload();

      // Note: In a real app, we'd update the UI dynamically instead of reloading
      // We'd also start the refund countdown timer here

    } catch (error) {
      console.error('Payment error:', error);
      showToast(error.message || 'Payment failed', 'error');
      payBtn.disabled = false;
      payBtn.textContent = originalText;
    }
  });
}

function startRefundCountdown(seconds, transactionId) {
  const timer = document.getElementById('countdown-timer');
  const refundBtn = document.getElementById('refund-btn');
  const widget = document.getElementById('refund-widget');
  
  if (!timer || !refundBtn || !widget) return;
  
  widget.style.display = 'flex';
  
  let remaining = seconds;

  const tick = () => {
    const minutes = Math.floor(remaining / 60);
    const secs = remaining % 60;
    timer.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;

    // Update styling based on time remaining
    timer.classList.remove('warning', 'danger');
    if (remaining <= 60) {
      timer.classList.add('danger');
    } else if (remaining <= 300) {
      timer.classList.add('warning');
    }

    if (remaining <= 0) {
      refundBtn.disabled = true;
      refundBtn.textContent = 'Window Closed';
      return;
    }

    remaining--;
    setTimeout(tick, 1000);
  };

  tick();

  // Setup refund button
  refundBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to refund this article?')) {
      return;
    }

    refundBtn.disabled = true;
    refundBtn.textContent = 'Processing...';

    try {
      const result = await api.refundTransaction(transactionId);
      auth.updateWalletBalance(result.balance_cents);
      showToast('Refund processed successfully', 'success');
      
      // Redirect to newsstand
      setTimeout(() => {
        window.location.hash = '#/';
      }, 1500);

    } catch (error) {
      showToast(error.message || 'Refund failed', 'error');
      refundBtn.disabled = false;
      refundBtn.textContent = 'Refund';
    }
  });
}

export default renderArticle;

