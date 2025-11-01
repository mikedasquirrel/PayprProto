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
        
        <!-- Mobile Menu Toggle -->
        <button class="navbar-mobile-toggle" id="mobile-menu-toggle" aria-label="Toggle menu">
          <span></span>
          <span></span>
          <span></span>
        </button>
        
        <div class="navbar-menu" id="navbar-menu">
          <!-- Explore Dropdown -->
          <div class="navbar-dropdown">
            <button class="navbar-link navbar-dropdown-trigger">
              Explore ▾
            </button>
            <div class="navbar-dropdown-menu">
              <a href="#/" class="navbar-dropdown-item">Newsstand</a>
              <a href="#/publishers" class="navbar-dropdown-item">Publishers</a>
              <a href="#/publications" class="navbar-dropdown-item">Publications</a>
              <div class="navbar-dropdown-divider"></div>
              <a href="#/showcase/smerconish" class="navbar-dropdown-item">
                <span class="demo-badge-small">DEMO</span>
                Smerconish
              </a>
              <a href="#/showcase/technewsletter" class="navbar-dropdown-item">
                <span class="demo-badge-small" style="background: linear-gradient(135deg, #00D9FF, #00FF94);">DEMO</span>
                TechPulse
              </a>
            </div>
          </div>
          
          <!-- Platform Dropdown -->
          <div class="navbar-dropdown">
            <button class="navbar-link navbar-dropdown-trigger">
              Platform ▾
            </button>
            <div class="navbar-dropdown-menu">
              <a href="#/about" class="navbar-dropdown-item">About</a>
              <a href="#/for-writers" class="navbar-dropdown-item">For Writers</a>
              <a href="#/platform" class="navbar-dropdown-item">How It Works</a>
            </div>
          </div>
          
          ${isAuthenticated ? `
            <!-- Tools Dropdown (Authenticated) -->
            <div class="navbar-dropdown">
              <button class="navbar-link navbar-dropdown-trigger">
                Tools ▾
              </button>
              <div class="navbar-dropdown-menu">
                <a href="#/author/dashboard" class="navbar-dropdown-item">✍️ Author Dashboard</a>
                <a href="#/author/submit" class="navbar-dropdown-item">Submit Article</a>
                <div class="navbar-dropdown-divider"></div>
                <a href="#/publisher/console" class="navbar-dropdown-item">📰 Publisher Console</a>
                <a href="#/publisher/content" class="navbar-dropdown-item">Manage Content</a>
                <div class="navbar-dropdown-divider"></div>
                <a href="#/admin/dashboard" class="navbar-dropdown-item">⚙️ Admin Panel</a>
              </div>
            </div>
          ` : ''}
          
          <!-- Tours Dropdown -->
          <div class="navbar-dropdown">
            <button class="navbar-link navbar-dropdown-trigger">
              🎓 Tours ▾
            </button>
            <div class="navbar-dropdown-menu">
              <button class="navbar-dropdown-item tour-trigger" data-tour="reader">
                📖 Reader Tour
              </button>
              <button class="navbar-dropdown-item tour-trigger" data-tour="author">
                ✍️ Author Tour
              </button>
              <button class="navbar-dropdown-item tour-trigger" data-tour="publisher">
                📰 Publisher Tour
              </button>
            </div>
          </div>
          
          <!-- Account Section -->
          <div class="navbar-account">
            ${isAuthenticated ? `
              <a href="#/wallet" class="navbar-link navbar-wallet">
                💰 $${(walletBalance / 100).toFixed(2)}
              </a>
              <div class="navbar-dropdown">
                <button class="navbar-link navbar-dropdown-trigger navbar-user-menu">
                  Account ▾
                </button>
                <div class="navbar-dropdown-menu navbar-dropdown-menu-right">
                  <a href="#/wallet" class="navbar-dropdown-item">Wallet</a>
                  <a href="#/history" class="navbar-dropdown-item">History</a>
                  <div class="navbar-dropdown-divider"></div>
                  <button class="navbar-dropdown-item" id="logout-btn">
                    Logout
                  </button>
                </div>
              </div>
            ` : `
              <a href="#/login" class="btn btn-sm btn-primary">Login</a>
            `}
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    
    // Logout button
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
    
    // Mobile menu toggle
    const mobileToggle = this.container.querySelector('#mobile-menu-toggle');
    const navbarMenu = this.container.querySelector('#navbar-menu');
    
    if (mobileToggle && navbarMenu) {
      mobileToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        mobileToggle.classList.toggle('active');
        navbarMenu.classList.toggle('active');
      });
    }
    
    // Dropdown functionality
    const dropdowns = this.container.querySelectorAll('.navbar-dropdown');
    dropdowns.forEach(dropdown => {
      const trigger = dropdown.querySelector('.navbar-dropdown-trigger');
      const menu = dropdown.querySelector('.navbar-dropdown-menu');
      
      if (trigger && menu) {
        trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          
          // Close other dropdowns
          dropdowns.forEach(otherDropdown => {
            if (otherDropdown !== dropdown) {
              otherDropdown.classList.remove('active');
            }
          });
          
          // Toggle this dropdown
          dropdown.classList.toggle('active');
        });
      }
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
      dropdowns.forEach(dropdown => {
        dropdown.classList.remove('active');
      });
      if (navbarMenu) {
        navbarMenu.classList.remove('active');
      }
      if (mobileToggle) {
        mobileToggle.classList.remove('active');
      }
    });
    
    // Tour triggers
    const tourTriggers = this.container.querySelectorAll('.tour-trigger');
    tourTriggers.forEach(trigger => {
      trigger.addEventListener('click', () => {
        const tourType = trigger.dataset.tour;
        
        // Close dropdown
        dropdowns.forEach(dropdown => dropdown.classList.remove('active'));
        
        if (tourType === 'reader') {
          tours.startReaderTour();
        } else if (tourType === 'author') {
          tours.startAuthorTour();
        } else if (tourType === 'publisher') {
          tours.startPublisherTour();
        }
      });
    });

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

