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
import { renderAbout } from './js/pages/about.js';
import { renderPublications } from './js/pages/publications.js';
import { renderPlatform } from './js/pages/platform.js';
import { renderForWriters } from './js/pages/for-writers.js';
import { renderPaymentSuccess } from './js/pages/payment-success.js';
import { renderPaymentCancel } from './js/pages/payment-cancel.js';

// Publisher pages
import { renderPublisherConsole } from './js/pages/publisher-console.js';
import { renderPublisherContent } from './js/pages/publisher-content.js';
import { renderPublisherAuthors } from './js/pages/publisher-authors.js';
import { renderPublisherSettings } from './js/pages/publisher-settings.js';

// Admin pages
import { renderAdminDashboard } from './js/pages/admin-dashboard.js';
import { renderAdminTheme } from './js/pages/admin-theme.js';
import { renderAdminSite } from './js/pages/admin-site.js';
import { renderAdminUsers } from './js/pages/admin-users.js';

// Initialize app
async function init() {
  console.log('🚀 Paypr SPA initializing...');

  // Initialize navbar
  initNavbar();

  // Check authentication status
  await auth.checkAuth();

  // Register routes
  
  // Platform pages
  router.register('/about', renderAbout);
  router.register('/publications', renderPublications);
  router.register('/platform', renderPlatform);
  router.register('/for-writers', renderForWriters);
  
  // Browse pages
  router.register('/', renderNewsstand);
  router.register('/publishers', renderPublishers);
  router.register('/p/:slug', renderPublisher);
  router.register('/article/:id', renderArticle);
  
  // Account pages
  router.register('/wallet', renderWallet);
  router.register('/history', renderHistory);
  router.register('/login', renderLogin);
  
  // Payment pages
  router.register('/payment-success', renderPaymentSuccess);
  router.register('/payment-cancel', renderPaymentCancel);
  
  // Showcase routes (demo)
  router.register('/showcase/smerconish', renderSmerconishShowcase);
  router.register('/showcase/smerconish/article/:id', renderSmerconishArticle);
  
  // Author routes
  router.register('/author/dashboard', renderAuthorDashboard);
  router.register('/author/submit', renderAuthorSubmit);
  
  // Publisher routes
  router.register('/publisher/console', renderPublisherConsole);
  router.register('/publisher/content', renderPublisherContent);
  router.register('/publisher/authors', renderPublisherAuthors);
  router.register('/publisher/settings', renderPublisherSettings);
  
  // Admin routes
  router.register('/admin/dashboard', renderAdminDashboard);
  router.register('/admin/theme', renderAdminTheme);
  router.register('/admin/site', renderAdminSite);
  router.register('/admin/users', renderAdminUsers);

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

