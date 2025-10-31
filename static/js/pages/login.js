// Login Page
import auth from '../auth.js';
import router from '../router.js';

export async function renderLogin() {
  const content = document.getElementById('content');

  // If already authenticated, redirect to home
  if (auth.isAuthenticated) {
    router.navigate('/');
    return;
  }

  content.innerHTML = `
    <div class="container container-sm" style="padding: 4rem 1.5rem;">
      <div class="card" style="max-width: 500px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 2rem;">
          <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 1rem;">
            Welcome to <span class="text-gradient">paypr</span>
          </h1>
          <p style="color: var(--fog);">
            Sign in to start unlocking premium content
          </p>
        </div>

        <form id="login-form">
          <div class="form-group">
            <label class="form-label" for="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              class="form-input"
              placeholder="you@example.com"
              required
              autofocus
            />
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%;">
            Sign In
          </button>
        </form>

        <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--glass-border); text-align: center;">
          <p style="color: var(--smoke); font-size: 0.875rem; margin-bottom: 1rem;">
            Or use magic link
          </p>
          <button id="magic-link-btn" class="btn btn-secondary" style="width: 100%;">
            ✨ Send Magic Link
          </button>
        </div>

        <div style="margin-top: 2rem; padding: 1rem; background: rgba(0, 229, 255, 0.05); border: 1px solid rgba(0, 229, 255, 0.2); border-radius: var(--radius);">
          <p style="color: var(--fog); font-size: 0.875rem; text-align: center;">
            💡 <strong>Demo Mode:</strong> Any email works! New accounts get $5 starter balance.
          </p>
        </div>
      </div>
    </div>
  `;

  // Setup form
  const form = document.getElementById('login-form');
  const magicLinkBtn = document.getElementById('magic-link-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const emailInput = form.querySelector('#email');
    const submitBtn = form.querySelector('button[type="submit"]');
    const email = emailInput.value.trim();

    if (!email) return;

    // Disable form
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    const success = await auth.login(email);

    if (success) {
      // Redirect to home
      setTimeout(() => {
        router.navigate('/');
      }, 500);
    } else {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });

  magicLinkBtn.addEventListener('click', async () => {
    const emailInput = form.querySelector('#email');
    const email = emailInput.value.trim();

    if (!email) {
      emailInput.focus();
      return;
    }

    magicLinkBtn.disabled = true;
    magicLinkBtn.textContent = 'Sending...';

    await auth.requestMagicLink(email);

    magicLinkBtn.disabled = false;
    magicLinkBtn.textContent = '✨ Send Magic Link';
  });
}

export default renderLogin;

