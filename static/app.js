// Main Application Entry Point
import router from './js/router.js';
import auth from './js/auth.js';
import { initNavbar } from './js/components/navbar.js';

// Import page components
import { renderNewsstand } from './js/pages/newsstand.js';
import { renderPublisher } from './js/pages/publisher.js';
import { renderPublishers } from './js/pages/publishers.js';
import { renderArticle } from './js/pages/article.js';
import { renderWallet } from './js/pages/wallet.js';
import { renderHistory } from './js/pages/history.js';
import { renderLogin } from './js/pages/login.js';
import { renderSmerconishShowcase, renderSmerconishArticle } from './js/pages/showcase-smerconish.js';
import { renderAuthorDashboard } from './js/pages/author-dashboard.js';
import { renderAuthorSubmit } from './js/pages/author-submit.js';

// Initialize app
async function init() {
  console.log('🚀 Paypr SPA initializing...');

  // Initialize navbar
  initNavbar();

  // Check authentication status
  await auth.checkAuth();

  // Register routes
  router.register('/', renderNewsstand);
  router.register('/publishers', renderPublishers);
  router.register('/p/:slug', renderPublisher);
  router.register('/article/:id', renderArticle);
  router.register('/wallet', renderWallet);
  router.register('/history', renderHistory);
  router.register('/login', renderLogin);
  
  // Showcase routes
  router.register('/showcase/smerconish', renderSmerconishShowcase);
  router.register('/showcase/smerconish/article/:id', renderSmerconishArticle);
  
  // Author routes
  router.register('/author/dashboard', renderAuthorDashboard);
  router.register('/author/submit', renderAuthorSubmit);

  // Handle magic link verification
  router.register('/auth/verify', async (params) => {
    const token = params.token;
    if (token) {
      const success = await auth.verifyMagicLink(token);
      if (success) {
        router.navigate('/');
      } else {
        router.navigate('/login');
      }
    } else {
      router.navigate('/login');
    }
  });

  // Initial route handling
  router.handleRoute();

  console.log('✅ Paypr SPA ready!');
}

// Start the app
init();

// Make auth and router globally accessible for debugging
window.paypr = {
  auth,
  router,
  version: '2.0.0'
};

