// About Page - Platform information
export async function renderAbout() {
  const content = document.getElementById('content');

  content.innerHTML = `
    <div class="platform-page">
      <!-- Hero Section -->
      <div class="platform-hero">
        <div class="container">
          <h1 class="platform-hero-title">
            The Future of <span class="text-gradient">Quality Journalism</span>
          </h1>
          <p class="platform-hero-subtitle">
            Paypr is a micropayment platform that lets readers pay for what they read,
            publishers monetize their content, and writers earn fair compensation—all
            without subscriptions or paywalls.
          </p>
        </div>
      </div>

      <!-- How It Works -->
      <div class="container" style="padding: 4rem 1.5rem;">
        <h2 class="section-title">How It Works</h2>
        
        <div class="how-it-works-grid">
          <div class="how-it-works-step">
            <div class="step-number">1</div>
            <h3 class="step-title">Discover</h3>
            <p class="step-description">
              Browse premium articles from top publications without subscriptions.
              See exactly what each article costs before you commit.
            </p>
          </div>

          <div class="how-it-works-step">
            <div class="step-number">2</div>
            <h3 class="step-title">One Click</h3>
            <p class="step-description">
              Unlock any article with a single click. No forms, no signup friction.
              Your wallet handles everything instantly.
            </p>
          </div>

          <div class="how-it-works-step">
            <div class="step-number">3</div>
            <h3 class="step-title">Read & Enjoy</h3>
            <p class="step-description">
              Dive into quality content immediately. Writers and publishers get paid
              fairly. You only pay for what you actually read.
            </p>
          </div>
        </div>
      </div>

      <!-- Value Propositions -->
      <div class="platform-value-section">
        <div class="container">
          <div class="value-grid">
            <div class="value-card">
              <div class="value-icon">👤</div>
              <h3 class="value-title">For Readers</h3>
              <ul class="value-list">
                <li>No subscriptions required</li>
                <li>Pay only for what you read</li>
                <li>Instant access to premium content</li>
                <li>Support quality journalism directly</li>
                <li>Privacy-focused, no tracking</li>
              </ul>
            </div>

            <div class="value-card">
              <div class="value-icon">📰</div>
              <h3 class="value-title">For Publishers</h3>
              <ul class="value-list">
                <li>Increase digital revenue 3-5x</li>
                <li>Reach beyond subscription fatigue</li>
                <li>Flexible revenue sharing models</li>
                <li>Real-time analytics & insights</li>
                <li>Simple integration, no tech overhead</li>
              </ul>
            </div>

            <div class="value-card">
              <div class="value-icon">✍️</div>
              <h3 class="value-title">For Writers</h3>
              <ul class="value-list">
                <li>Earn directly from your work</li>
                <li>Submit to top publications</li>
                <li>Transparent revenue splits</li>
                <li>Keep your rights & independence</li>
                <li>Build your audience sustainably</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Key Benefits -->
      <div class="container" style="padding: 4rem 1.5rem;">
        <h2 class="section-title">Why Paypr?</h2>
        
        <div class="benefits-grid">
          <div class="benefit-item">
            <div class="benefit-icon">⚡</div>
            <h4 class="benefit-title">Instant Access</h4>
            <p class="benefit-text">
              One-click unlocks. No forms, no passwords, no friction. Just content.
            </p>
          </div>

          <div class="benefit-item">
            <div class="benefit-icon">💎</div>
            <h4 class="benefit-title">Fair Pricing</h4>
            <p class="benefit-text">
              Transparent micropayments. Publishers set prices, readers see value.
            </p>
          </div>

          <div class="benefit-item">
            <div class="benefit-icon">🔒</div>
            <h4 class="benefit-title">Privacy First</h4>
            <p class="benefit-text">
              No tracking, no data selling. Your reading habits are yours alone.
            </p>
          </div>

          <div class="benefit-item">
            <div class="benefit-icon">📈</div>
            <h4 class="benefit-title">Proven Results</h4>
            <p class="benefit-text">
              Publishers see 240% revenue increases. Readers love the flexibility.
            </p>
          </div>

          <div class="benefit-item">
            <div class="benefit-icon">🤝</div>
            <h4 class="benefit-title">Author Friendly</h4>
            <p class="benefit-text">
              Writers keep their rights and earn fair splits on every read.
            </p>
          </div>

          <div class="benefit-item">
            <div class="benefit-icon">🌍</div>
            <h4 class="benefit-title">Global Reach</h4>
            <p class="benefit-text">
              Break free from geographic paywalls. Quality content for everyone.
            </p>
          </div>
        </div>
      </div>

      <!-- Mission Statement -->
      <div class="platform-mission">
        <div class="container">
          <blockquote class="mission-quote">
            "We believe quality journalism should be accessible, sustainable, and fair.
            Paypr makes that possible by aligning incentives between readers, publishers,
            and writers. No subscriptions. No ads. No compromises."
          </blockquote>
        </div>
      </div>

      <!-- CTA Section -->
      <div class="container" style="padding: 4rem 1.5rem; text-align: center;">
        <h2 style="font-size: 2rem; margin-bottom: 1rem;">Ready to Get Started?</h2>
        <p style="color: var(--fog); margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto;">
          Join hundreds of publications and thousands of readers who are building
          a better future for journalism.
        </p>
        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
          <a href="#/" class="btn btn-primary btn-lg">Browse Newsstand</a>
          <a href="#/for-writers" class="btn btn-secondary btn-lg">I'm a Writer</a>
          <a href="#/platform" class="btn btn-outline btn-lg">Publisher Info</a>
        </div>
      </div>
    </div>
  `;
}

export default renderAbout;

