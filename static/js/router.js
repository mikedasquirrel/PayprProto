// Client-Side Router
class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.params = {};
    
    // Listen for hash changes
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
  }

  // Register a route
  register(path, handler) {
    this.routes.set(path, handler);
  }

  // Navigate to a route
  navigate(path) {
    window.location.hash = path;
  }

  // Handle route change
  async handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const [path, queryString] = hash.split('?');
    
    // Parse query parameters
    this.params = {};
    if (queryString) {
      const params = new URLSearchParams(queryString);
      for (const [key, value] of params) {
        this.params[key] = value;
      }
    }

    // Find matching route
    let handler = null;
    let routeParams = {};

    // Try exact match first
    if (this.routes.has(path)) {
      handler = this.routes.get(path);
    } else {
      // Try pattern matching
      for (const [pattern, routeHandler] of this.routes.entries()) {
        const match = this.matchRoute(pattern, path);
        if (match) {
          handler = routeHandler;
          routeParams = match;
          break;
        }
      }
    }

    // Ensure navbar is visible unless on showcase routes
    const navbar = document.getElementById('navbar');
    if (navbar && !path.startsWith('/showcase/')) {
      navbar.style.display = 'block';
    }

    // Execute handler or show 404
    if (handler) {
      this.currentRoute = path;
      this.params = { ...this.params, ...routeParams };
      await handler(this.params);
    } else {
      this.show404();
    }
  }

  // Match route pattern with path
  matchRoute(pattern, path) {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart.startsWith(':')) {
        // Dynamic parameter
        const paramName = patternPart.slice(1);
        params[paramName] = pathPart;
      } else if (patternPart !== pathPart) {
        // Mismatch
        return null;
      }
    }

    return params;
  }

  // Show 404 page
  show404() {
    // Ensure navbar is visible
    const navbar = document.getElementById('navbar');
    if (navbar) {
      navbar.style.display = 'block';
    }
    
    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="container" style="text-align: center; padding: 4rem 1.5rem;">
        <div style="font-size: 6rem; margin-bottom: 1rem;">404</div>
        <h1 style="font-size: 2rem; margin-bottom: 1rem;">Page Not Found</h1>
        <p style="color: var(--smoke); margin-bottom: 2rem;">
          The page you're looking for doesn't exist.
        </p>
        <button class="btn btn-primary" onclick="window.location.hash='#/'">
          Go Home
        </button>
      </div>
    `;
  }

  // Get current parameters
  getParams() {
    return this.params;
  }

  // Get specific parameter
  getParam(key) {
    return this.params[key];
  }
}

// Create and export singleton instance
const router = new Router();
export default router;

