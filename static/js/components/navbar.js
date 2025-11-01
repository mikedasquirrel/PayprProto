// Navbar Component
import auth from '../auth.js';
import router from '../router.js';
import tours from './tours.js';

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
          
          <!-- User Section -->
          ${isAuthenticated ? `
            <div class="navbar-section">
              <a href="#/author/dashboard" class="navbar-link">✍️ Author</a>
              <a href="#/publisher/console" class="navbar-link">📰 Publisher</a>
              <a href="#/admin/dashboard" class="navbar-link">⚙️ Admin</a>
            </div>
            
            <div class="navbar-divider"></div>
          ` : ''}
          
          <!-- Account Section -->
          <div class="navbar-section">
            ${isAuthenticated ? `
              <a href="#/wallet" class="navbar-link wallet-badge">
                <span>💰</span>
                <span class="wallet-amount">$${(walletBalance / 100).toFixed(2)}</span>
              </a>
              <a href="#/history" class="navbar-link">History</a>
            ` : ''}
            <div class="navbar-tours-dropdown" style="position: relative;">
              <button class="navbar-link" id="tours-dropdown-btn" style="cursor: pointer; border: none; background: none; color: inherit; font: inherit;">
                🎓 Tours ▾
              </button>
              <div class="tours-dropdown-menu" id="tours-dropdown-menu" style="
                display: none;
                position: absolute;
                top: 100%;
                right: 0;
                background: var(--glass-bg);
                border: 1px solid var(--glass-border);
                border-radius: var(--radius);
                padding: 0.5rem 0;
                margin-top: 0.5rem;
                min-width: 200px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                z-index: 1000;
              ">
                <button class="tour-menu-item" data-tour="reader" style="
                  width: 100%;
                  padding: 0.75rem 1rem;
                  border: none;
                  background: none;
                  color: var(--paper);
                  text-align: left;
                  cursor: pointer;
                  transition: background 0.2s;
                  font-size: 0.95rem;
                  display: flex;
                  align-items: center;
                  gap: 0.5rem;
                ">
                  <span>📖</span>
                  <span>Reader Tour</span>
                </button>
                <button class="tour-menu-item" data-tour="author" style="
                  width: 100%;
                  padding: 0.75rem 1rem;
                  border: none;
                  background: none;
                  color: var(--paper);
                  text-align: left;
                  cursor: pointer;
                  transition: background 0.2s;
                  font-size: 0.95rem;
                  display: flex;
                  align-items: center;
                  gap: 0.5rem;
                ">
                  <span>✍️</span>
                  <span>Author Tour</span>
                </button>
                <button class="tour-menu-item" data-tour="publisher" style="
                  width: 100%;
                  padding: 0.75rem 1rem;
                  border: none;
                  background: none;
                  color: var(--paper);
                  text-align: left;
                  cursor: pointer;
                  transition: background 0.2s;
                  font-size: 0.95rem;
                  display: flex;
                  align-items: center;
                  gap: 0.5rem;
                ">
                  <span>📰</span>
                  <span>Publisher Tour</span>
                </button>
              </div>
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <a href="#/showcase/smerconish" class="navbar-link navbar-demo-link">
                <span class="demo-badge">DEMO</span>
                Smerconish
              </a>
              <a href="#/showcase/technewsletter" class="navbar-link navbar-demo-link">
                <span class="demo-badge" style="background: linear-gradient(135deg, #00D9FF, #00FF94);">DEMO</span>
                TechPulse
              </a>
            </div>
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
    
    // Tours dropdown functionality
    const toursDropdownBtn = this.container.querySelector('#tours-dropdown-btn');
    const toursDropdownMenu = this.container.querySelector('#tours-dropdown-menu');
    
    if (toursDropdownBtn && toursDropdownMenu) {
      // Toggle dropdown
      toursDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = toursDropdownMenu.style.display === 'block';
        toursDropdownMenu.style.display = isVisible ? 'none' : 'block';
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        toursDropdownMenu.style.display = 'none';
      });
      
      // Tour menu item clicks
      const tourMenuItems = this.container.querySelectorAll('.tour-menu-item');
      tourMenuItems.forEach(item => {
        item.addEventListener('click', () => {
          const tourType = item.dataset.tour;
          toursDropdownMenu.style.display = 'none';
          
          if (tourType === 'reader') {
            tours.startReaderTour();
          } else if (tourType === 'author') {
            tours.startAuthorTour();
          } else if (tourType === 'publisher') {
            tours.startPublisherTour();
          }
        });
        
        // Hover effect
        item.addEventListener('mouseenter', () => {
          item.style.background = 'var(--glass-border)';
        });
        item.addEventListener('mouseleave', () => {
          item.style.background = 'none';
        });
      });
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

