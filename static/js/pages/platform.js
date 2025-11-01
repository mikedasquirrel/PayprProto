// Platform Overview Page - Technical details and integration information
export async function renderPlatform() {
  const content = document.getElementById('content');

  content.innerHTML = `
    <div class="platform-page">
      <!-- Hero Section -->
      <div class="platform-hero">
        <div class="container">
          <h1 class="platform-hero-title">
            Publisher <span class="text-gradient">Platform</span>
          </h1>
          <p class="platform-hero-subtitle">
            Everything you need to monetize your content with micropayments.
            Simple integration. Transparent pricing. Fair revenue splits.
          </p>
        </div>
      </div>

      <!-- Integration Overview -->
      <div class="container" style="padding: 4rem 1.5rem;">
        <h2 class="section-title">How It Works</h2>
        <div class="platform-features-grid">
          <div class="platform-feature">
            <div class="feature-number">1</div>
            <h3 class="feature-title">Simple Integration</h3>
            <p class="feature-description">
              Add Paypr to your site in minutes with our JavaScript SDK.
              Works with any CMS or custom platform.
            </p>
            <div class="feature-code">
              <code>&lt;script src="paypr.js"&gt;&lt;/script&gt;</code>
            </div>
          </div>

          <div class="platform-feature">
            <div class="feature-number">2</div>
            <h3 class="feature-title">Set Your Prices</h3>
            <p class="feature-description">
              You control pricing. Set default rates or customize per article.
              From $0.25 to $5.00 per piece.
            </p>
          </div>

          <div class="platform-feature">
            <div class="feature-number">3</div>
            <h3 class="feature-title">Get Paid</h3>
            <p class="feature-description">
              Automatic payouts weekly or monthly. Direct deposit to your account.
              Track every transaction in real-time.
            </p>
          </div>
        </div>
      </div>

      <!-- Revenue Model -->
      <div class="platform-revenue-section">
        <div class="container">
          <h2 class="section-title">Revenue Model</h2>
          <div class="revenue-breakdown-card">
            <h3 style="margin-bottom: 2rem; text-align: center;">Transparent Pricing</h3>
            
            <div class="revenue-example">
              <div class="revenue-example-header">
                <span>Example: $0.99 Article Purchase</span>
              </div>
              
              <div class="revenue-split-bars">
                <div class="revenue-bar" style="--percent: 85; --color: #10b981;">
                  <div class="revenue-bar-fill"></div>
                  <div class="revenue-bar-label">
                    <span>Publisher</span>
                    <strong>$0.84 (85%)</strong>
                  </div>
                </div>
                
                <div class="revenue-bar" style="--percent: 10; --color: #6366f1;">
                  <div class="revenue-bar-fill"></div>
                  <div class="revenue-bar-label">
                    <span>Paypr Platform</span>
                    <strong>$0.10 (10%)</strong>
                  </div>
                </div>
                
                <div class="revenue-bar" style="--percent: 5; --color: #8b5cf6;">
                  <div class="revenue-bar-fill"></div>
                  <div class="revenue-bar-label">
                    <span>Payment Processing</span>
                    <strong>$0.05 (5%)</strong>
                  </div>
                </div>
              </div>

              <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--glass-border);">
                <h4 style="margin-bottom: 1rem;">Flexible Revenue Sharing</h4>
                <ul class="value-list">
                  <li>Split revenue with authors automatically</li>
                  <li>Configure custom split rules per article</li>
                  <li>Support contributors, editors, and more</li>
                  <li>Full transparency on every transaction</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Features Grid -->
      <div class="container" style="padding: 4rem 1.5rem;">
        <h2 class="section-title">Platform Features</h2>
        <div class="platform-features-grid">
          <div class="platform-feature-card">
            <div class="feature-icon">📊</div>
            <h3 class="feature-card-title">Real-Time Analytics</h3>
            <p class="feature-card-text">
              Track reads, revenue, and engagement in real-time. Export data
              anytime. Make data-driven decisions.
            </p>
          </div>

          <div class="platform-feature-card">
            <div class="feature-icon">⚡</div>
            <h3 class="feature-card-title">Instant Unlocks</h3>
            <p class="feature-card-text">
              Readers unlock content in milliseconds. No page reloads,
              no friction. Just seamless access.
            </p>
          </div>

          <div class="platform-feature-card">
            <div class="feature-icon">🎨</div>
            <h3 class="feature-card-title">Customizable UI</h3>
            <p class="feature-card-text">
              Match your brand perfectly. Customize colors, fonts, and
              messaging. White-label options available.
            </p>
          </div>

          <div class="platform-feature-card">
            <div class="feature-icon">🔐</div>
            <h3 class="feature-card-title">Secure & Compliant</h3>
            <p class="feature-card-text">
              Bank-level security. PCI DSS compliant. GDPR ready.
              Your data and your readers' data are safe.
            </p>
          </div>

          <div class="platform-feature-card">
            <div class="feature-icon">📱</div>
            <h3 class="feature-card-title">Mobile Optimized</h3>
            <p class="feature-card-text">
              Perfect experience on any device. Mobile-first design
              ensures readers can unlock anywhere.
            </p>
          </div>

          <div class="platform-feature-card">
            <div class="feature-icon">🤝</div>
            <h3 class="feature-card-title">Author Marketplace</h3>
            <p class="feature-card-text">
              Access quality content from independent writers. Build
              your catalog with revenue-sharing deals.
            </p>
          </div>
        </div>
      </div>

      <!-- Integration Details -->
      <div class="platform-integration-section">
        <div class="container">
          <h2 class="section-title">Integration Options</h2>
          
          <div class="integration-tabs">
            <div class="integration-option">
              <h3 class="integration-title">
                <span class="integration-icon">🔌</span>
                JavaScript SDK
              </h3>
              <p class="integration-description">
                Drop-in script for any website. Works with WordPress, Ghost,
                Medium, and custom platforms. Full documentation included.
              </p>
              <div class="integration-code-block">
                <pre><code>&lt;script src="https://cdn.paypr.co/sdk.js"&gt;&lt;/script&gt;
&lt;script&gt;
  Paypr.init({
    publisherId: 'your-id',
    articleId: '123'
  });
&lt;/script&gt;</code></pre>
              </div>
            </div>

            <div class="integration-option">
              <h3 class="integration-title">
                <span class="integration-icon">🔗</span>
                REST API
              </h3>
              <p class="integration-description">
                Full-featured API for custom integrations. Create unlocks,
                verify access, track analytics programmatically.
              </p>
              <div class="integration-code-block">
                <pre><code>POST /api/pay
{
  "article_id": 123,
  "user_id": "abc123"
}

Response: {
  "access_token": "...",
  "balance_cents": 450
}</code></pre>
              </div>
            </div>

            <div class="integration-option">
              <h3 class="integration-title">
                <span class="integration-icon">🎯</span>
                WordPress Plugin
              </h3>
              <p class="integration-description">
                Native WordPress integration. No code required. Manage
                pricing and settings from your WordPress dashboard.
              </p>
              <a href="#/contact" class="btn btn-secondary">Request Plugin</a>
            </div>
          </div>
        </div>
      </div>

      <!-- Getting Started -->
      <div class="container" style="padding: 4rem 1.5rem;">
        <h2 class="section-title">Getting Started</h2>
        <div class="getting-started-steps">
          <div class="gs-step">
            <div class="gs-step-number">1</div>
            <div class="gs-step-content">
              <h4 class="gs-step-title">Sign Up</h4>
              <p>Create your publisher account in 2 minutes. No credit card required to start.</p>
            </div>
          </div>

          <div class="gs-step">
            <div class="gs-step-number">2</div>
            <div class="gs-step-content">
              <h4 class="gs-step-title">Integrate</h4>
              <p>Add our SDK to your site or use our WordPress plugin. Test mode available.</p>
            </div>
          </div>

          <div class="gs-step">
            <div class="gs-step-number">3</div>
            <div class="gs-step-content">
              <h4 class="gs-step-title">Configure</h4>
              <p>Set your pricing, customize the UI, and configure revenue splits.</p>
            </div>
          </div>

          <div class="gs-step">
            <div class="gs-step-number">4</div>
            <div class="gs-step-content">
              <h4 class="gs-step-title">Go Live</h4>
              <p>Switch to production mode and start earning. We're here to help every step.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- CTA Section -->
      <div class="platform-cta-section">
        <div class="container">
          <h2 style="font-size: 2rem; margin-bottom: 1rem;">Ready to Monetize Your Content?</h2>
          <p style="color: var(--fog); margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto;">
            Join 500+ publications using Paypr to grow their digital revenue.
            Get started today with our free trial.
          </p>
          <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
            <a href="#/contact" class="btn btn-primary btn-lg">Start Free Trial</a>
            <a href="#/publications" class="btn btn-outline btn-lg">See Who's Using Paypr</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

export default renderPlatform;

