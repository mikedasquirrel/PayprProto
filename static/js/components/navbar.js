// Navbar Component
import auth from '../auth.js';
import router from '../router.js';

class Navbar {
  constructor() {
    this.container = document.getElementById('navbar');
    this.render();
    
    // Subscribe to auth changes
    auth.subscribe(() => this.render());
  }

  render() {
    const walletBalance = auth.getWalletBalance();
    const isAuthenticated = auth.isAuthenticated;

    this.container.innerHTML = `
      <div class="navbar-content">
        <a href="#/" class="navbar-brand">paypr</a>
        
        <div class="navbar-links">
          <a href="#/" class="navbar-link">Newsstand</a>
          <a href="#/publishers" class="navbar-link">Publishers</a>
          <a href="#/showcase/smerconish" class="navbar-link" style="color: var(--accent-warning);">🎯 Smerconish Demo</a>
          
          ${isAuthenticated ? `
            <a href="#/author/dashboard" class="navbar-link">✍️ Author</a>
            <a href="#/wallet" class="navbar-link wallet-badge">
              <span>💰</span>
              <span class="wallet-amount">$${(walletBalance / 100).toFixed(2)}</span>
            </a>
            <a href="#/history" class="navbar-link">History</a>
            <button class="btn btn-sm btn-secondary" id="logout-btn">
              Logout
            </button>
          ` : `
            <a href="#/login" class="btn btn-sm btn-primary">Login</a>
          `}
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

