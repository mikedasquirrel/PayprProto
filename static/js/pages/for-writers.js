// For Writers Landing Page - Writer value proposition and onboarding
import auth from '../auth.js';
import router from '../router.js';

export async function renderForWriters() {
  const content = document.getElementById('content');
  const isAuthenticated = auth.isAuthenticated;

  content.innerHTML = `
    <div class="platform-page">
      <!-- Hero Section -->
      <div class="platform-hero">
        <div class="container">
          <h1 class="platform-hero-title">
            Write. Publish. <span class="text-gradient">Get Paid</span>.
          </h1>
          <p class="platform-hero-subtitle">
            Join the Paypr writer marketplace and earn from your work.
            Submit to top publications, set your own prices, and keep your rights.
          </p>
          <div style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
            ${isAuthenticated ? `
              <a href="#/author/dashboard" class="btn btn-primary btn-lg">Go to Dashboard</a>
              <a href="#/author/submit" class="btn btn-secondary btn-lg">Submit Article</a>
            ` : `
              <a href="#/login" class="btn btn-primary btn-lg">Create Free Account</a>
              <a href="#/about" class="btn btn-outline btn-lg">Learn More</a>
            `}
          </div>
        </div>
      </div>

      <!-- How It Works for Writers -->
      <div class="container" style="padding: 4rem 1.5rem;">
        <h2 class="section-title">How It Works</h2>
        
        <div class="how-it-works-grid">
          <div class="how-it-works-step">
            <div class="step-number">1</div>
            <h3 class="step-title">Create Your Profile</h3>
            <p class="step-description">
              Sign up for free and build your writer profile. Showcase your work,
              set your rates, and tell your story.
            </p>
          </div>

          <div class="how-it-works-step">
            <div class="step-number">2</div>
            <h3 class="step-title">Submit Your Work</h3>
            <p class="step-description">
              Submit articles to publications or publish independently. You choose
              the licensing model and revenue split.
            </p>
          </div>

          <div class="how-it-works-step">
            <div class="step-number">3</div>
            <h3 class="step-title">Earn Per Read</h3>
            <p class="step-description">
              Get paid every time someone reads your work. Track earnings in
              real-time and cash out whenever you want.
            </p>
          </div>
        </div>
      </div>

      <!-- Value Propositions -->
      <div class="writer-value-section">
        <div class="container">
          <h2 class="section-title">Why Writers Love Paypr</h2>
          
          <div class="value-grid">
            <div class="value-card">
              <div class="value-icon">💰</div>
              <h3 class="value-title">Fair Compensation</h3>
              <p class="value-text">
                Earn 60-85% of revenue from your articles. Transparent splits.
                No hidden fees. Get paid for your talent.
              </p>
            </div>

            <div class="value-card">
              <div class="value-icon">📝</div>
              <h3 class="value-title">Keep Your Rights</h3>
              <p class="value-text">
                You own your work. Choose revenue-sharing or buyout licensing.
                Retain creative control and independence.
              </p>
            </div>

            <div class="value-card">
              <div class="value-icon">🎯</div>
              <h3 class="value-title">Submit to Top Pubs</h3>
              <p class="value-text">
                Get your work in front of millions. 500+ publications are
                looking for quality content on Paypr.
              </p>
            </div>

            <div class="value-card">
              <div class="value-icon">📊</div>
              <h3 class="value-title">Real-Time Analytics</h3>
              <p class="value-text">
                Track reads, earnings, and engagement. Know what resonates
                with your audience and optimize accordingly.
              </p>
            </div>

            <div class="value-card">
              <div class="value-icon">⚡</div>
              <h3 class="value-title">Instant Publishing</h3>
              <p class="value-text">
                Publish independently or wait for publisher approval. Either
                way, start earning within hours, not months.
              </p>
            </div>

            <div class="value-card">
              <div class="value-icon">🌍</div>
              <h3 class="value-title">Global Audience</h3>
              <p class="value-text">
                Reach readers worldwide. No geographic limits. Your words,
                everywhere, earning revenue 24/7.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Success Stories -->
      <div class="container" style="padding: 4rem 1.5rem;">
        <h2 class="section-title">Writer Success Stories</h2>
        
        <div class="testimonials-grid">
          <div class="testimonial-card">
            <div class="testimonial-quote">
              "I've earned more in 3 months on Paypr than my entire first year freelancing.
              The marketplace connects me with great publications, and the revenue splits are fair."
            </div>
            <div class="testimonial-author">
              <div class="testimonial-logo">✍️</div>
              <div>
                <div class="testimonial-name">Sarah Chen</div>
                <div class="testimonial-role">Technology Writer</div>
              </div>
            </div>
            <div class="testimonial-stats">
              <div class="stat-badge">$12,400 earned</div>
              <div class="stat-badge">89 articles published</div>
            </div>
          </div>

          <div class="testimonial-card">
            <div class="testimonial-quote">
              "The transparency is incredible. I see exactly who's reading my work and
              how much I'm earning per article. No more guessing or chasing invoices."
            </div>
            <div class="testimonial-author">
              <div class="testimonial-logo">✍️</div>
              <div>
                <div class="testimonial-name">Marcus Rodriguez</div>
                <div class="testimonial-role">Investigative Journalist</div>
              </div>
            </div>
            <div class="testimonial-stats">
              <div class="stat-badge">$8,900 earned</div>
              <div class="stat-badge">34 articles published</div>
            </div>
          </div>

          <div class="testimonial-card">
            <div class="testimonial-quote">
              "I can publish independently AND submit to major publications from one dashboard.
              Paypr makes it so easy to manage my entire writing career."
            </div>
            <div class="testimonial-author">
              <div class="testimonial-logo">✍️</div>
              <div>
                <div class="testimonial-name">Aisha Patel</div>
                <div class="testimonial-role">Opinion Columnist</div>
              </div>
            </div>
            <div class="testimonial-stats">
              <div class="stat-badge">$15,600 earned</div>
              <div class="stat-badge">127 articles published</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Licensing Models -->
      <div class="writer-licensing-section">
        <div class="container">
          <h2 class="section-title">Choose Your Licensing Model</h2>
          
          <div class="licensing-grid">
            <div class="licensing-option">
              <h3 class="licensing-title">Independent</h3>
              <div class="licensing-price">85% Revenue</div>
              <p class="licensing-description">
                Publish on your own. Set your price. Keep 85% of every sale.
                Perfect for building your audience.
              </p>
              <ul class="licensing-features">
                <li>Full creative control</li>
                <li>Set your own pricing</li>
                <li>Keep all rights</li>
                <li>Instant publishing</li>
              </ul>
            </div>

            <div class="licensing-option featured">
              <div class="licensing-badge">Most Popular</div>
              <h3 class="licensing-title">Revenue Share</h3>
              <div class="licensing-price">60-75% Revenue</div>
              <p class="licensing-description">
                Partner with publications. Share revenue on each read. Reach
                established audiences while keeping your rights.
              </p>
              <ul class="licensing-features">
                <li>Access to major publications</li>
                <li>Negotiable revenue splits</li>
                <li>Editorial support</li>
                <li>Keep your rights</li>
              </ul>
            </div>

            <div class="licensing-option">
              <h3 class="licensing-title">Buyout</h3>
              <div class="licensing-price">One-Time Fee</div>
              <p class="licensing-description">
                Sell exclusive rights for a guaranteed payment. Great for
                time-sensitive pieces or when you need cash upfront.
              </p>
              <ul class="licensing-features">
                <li>Guaranteed payment</li>
                <li>Upfront cash</li>
                <li>No ongoing tracking</li>
                <li>Rights transfer to publisher</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Getting Started -->
      <div class="container" style="padding: 4rem 1.5rem;">
        <h2 class="section-title">Getting Started is Easy</h2>
        
        <div class="getting-started-steps">
          <div class="gs-step">
            <div class="gs-step-number">1</div>
            <div class="gs-step-content">
              <h4 class="gs-step-title">Sign Up Free</h4>
              <p>Create your account in 30 seconds. No credit card needed. Start with $5 in reading credits.</p>
            </div>
          </div>

          <div class="gs-step">
            <div class="gs-step-number">2</div>
            <div class="gs-step-content">
              <h4 class="gs-step-title">Build Your Profile</h4>
              <p>Add your bio, photo, and portfolio. Set your default pricing and preferences.</p>
            </div>
          </div>

          <div class="gs-step">
            <div class="gs-step-number">3</div>
            <div class="gs-step-content">
              <h4 class="gs-step-title">Submit Your First Article</h4>
              <p>Upload your article, choose a licensing model, and submit to publications or publish independently.</p>
            </div>
          </div>

          <div class="gs-step">
            <div class="gs-step-number">4</div>
            <div class="gs-step-content">
              <h4 class="gs-step-title">Start Earning</h4>
              <p>Track reads and earnings in real-time. Cash out anytime via direct deposit.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- FAQ Section -->
      <div class="writer-faq-section">
        <div class="container">
          <h2 class="section-title">Frequently Asked Questions</h2>
          
          <div class="faq-grid">
            <div class="faq-item">
              <h4 class="faq-question">How much can I earn?</h4>
              <p class="faq-answer">
                Writers on Paypr earn $0.50 to $5.00 per article read, depending on
                pricing and revenue splits. Top writers earn $10,000+ per month.
              </p>
            </div>

            <div class="faq-item">
              <h4 class="faq-question">Do I keep my rights?</h4>
              <p class="faq-answer">
                For independent and revenue-share models, yes! You retain full rights.
                Only buyout licenses transfer rights, and those are optional.
              </p>
            </div>

            <div class="faq-item">
              <h4 class="faq-question">How do I get paid?</h4>
              <p class="faq-answer">
                Earnings are paid via direct deposit weekly or monthly. Minimum payout
                is $25. Track everything in your dashboard.
              </p>
            </div>

            <div class="faq-item">
              <h4 class="faq-question">Can I submit to multiple publications?</h4>
              <p class="faq-answer">
                Each article can belong to one publication at a time. But you can
                submit different articles to different publications simultaneously.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Final CTA -->
      <div class="platform-cta-section">
        <div class="container">
          <h2 style="font-size: 2rem; margin-bottom: 1rem;">
            Ready to Start Writing?
          </h2>
          <p style="color: var(--fog); margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto;">
            Join thousands of writers earning sustainable income from their work.
            Free to join. No commitments. Start publishing today.
          </p>
          <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
            ${isAuthenticated ? `
              <a href="#/author/dashboard" class="btn btn-primary btn-lg">Go to Dashboard</a>
              <a href="#/author/submit" class="btn btn-secondary btn-lg">Submit Article</a>
            ` : `
              <a href="#/login" class="btn btn-primary btn-lg">Create Free Account</a>
              <a href="#/" class="btn btn-outline btn-lg">Browse Newsstand</a>
            `}
          </div>
        </div>
      </div>
    </div>
  `;
}

export default renderForWriters;

