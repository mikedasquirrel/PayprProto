// Navbar Component
import auth from '../auth.js';
import router from '../router.js';

class Navbar {
  constructor() {
    this.container = document.getElementById('navbar');
    this.render();
    
    // Subscribe to auth changes
    auth.subscribe(() => this.render());
    
    // Listen for route changes to update active link
    window.addEventListener('hashchange', () => {
      // Re-check container in case it was lost
      if (!this.container || !document.getElementById('navbar')) {
        this.container = document.getElementById('navbar');
        if (this.container && !this.container.innerHTML) {
          this.render();
        }
      }
      this.highlightActiveLink();
    });
  }

  render() {
    if (!this.container) {
      console.error('Navbar container not found');
      return;
    }
    
    const walletBalance = auth.getWalletBalance();
    const isAuthenticated = auth.isAuthenticated;

    this.container.innerHTML = `
      <div class="navbar-content">
        <a href="#/" class="navbar-brand">paypr</a>
        
        <div class="navbar-links">
          <!-- Platform Section -->
          <div class="navbar-section">
            <a href="#/about" class="navbar-link">About</a>
            <a href="#/publications" class="navbar-link">Publications</a>
            <a href="#/for-writers" class="navbar-link">For Writers</a>
            <a href="#/platform" class="navbar-link">Platform</a>
          </div>
          
          <div class="navbar-divider"></div>
          
          <!-- Browse Section -->
          <div class="navbar-section">
            <a href="#/" class="navbar-link">Newsstand</a>
            <a href="#/publishers" class="navbar-link">Publishers</a>
          </div>
          
          <div class="navbar-divider"></div>
          
          <!-- User/Demo Section -->
          <div class="navbar-section">
            ${isAuthenticated ? `
              <a href="#/author/dashboard" class="navbar-link">Author</a>
              <a href="#/wallet" class="navbar-link wallet-badge">
                <span>💰</span>
                <span class="wallet-amount">$${(walletBalance / 100).toFixed(2)}</span>
              </a>
              <a href="#/history" class="navbar-link">History</a>
            ` : ''}
            <a href="#/showcase/smerconish" class="navbar-link navbar-demo-link">
              <span class="demo-badge">DEMO</span>
              Smerconish
            </a>
            ${isAuthenticated ? `
              <button class="btn btn-sm btn-secondary" id="logout-btn">
                Logout
              </button>
            ` : `
              <a href="#/login" class="btn btn-sm btn-primary">Login</a>
            `}
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    if (isAuthenticated) {
      const logoutBtn = this.container.querySelector('#logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          await auth.logout();
          router.navigate('/');
        });
      }
    }

    // Highlight active link
    this.highlightActiveLink();
  }

  highlightActiveLink() {
    if (!this.container) {
      return;
    }
    
    const currentHash = window.location.hash.slice(1);
    const links = this.container.querySelectorAll('.navbar-link');
    
    links.forEach(link => {
      const href = link.getAttribute('href').slice(1);
      if (currentHash === href || (currentHash === '' && href === '/')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
}

// Initialize navbar
let navbarInstance = null;

export function initNavbar() {
  if (!navbarInstance) {
    navbarInstance = new Navbar();
  }
  return navbarInstance;
}

export default Navbar;

