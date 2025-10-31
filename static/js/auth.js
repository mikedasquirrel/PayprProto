// Auth State Management
import api from './api.js';
import { showToast } from './components/toast.js';

class AuthManager {
  constructor() {
    this.user = null;
    this.isAuthenticated = false;
    this.listeners = [];
  }

  // Subscribe to auth state changes
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Notify all listeners of state change
  notify() {
    this.listeners.forEach(callback => callback(this.user, this.isAuthenticated));
  }

  // Check current auth status
  async checkAuth() {
    try {
      const data = await api.getCurrentUser();
      if (data.authenticated) {
        this.user = data.user;
        this.isAuthenticated = true;
      } else {
        this.user = null;
        this.isAuthenticated = false;
      }
      this.notify();
      return this.isAuthenticated;
    } catch (error) {
      this.user = null;
      this.isAuthenticated = false;
      this.notify();
      return false;
    }
  }

  // Login with email
  async login(email) {
    try {
      const data = await api.login(email);
      this.user = data.user;
      this.isAuthenticated = true;
      this.notify();
      showToast('Logged in successfully!', 'success');
      return true;
    } catch (error) {
      showToast(error.message || 'Login failed', 'error');
      return false;
    }
  }

  // Request magic link
  async requestMagicLink(email) {
    try {
      const data = await api.requestMagicLink(email);
      showToast('Magic link sent! Check your email.', 'success');
      // For demo, show the link
      if (data.demo_link) {
        console.log('Demo magic link:', data.demo_link);
        showToast(`Demo link: ${data.demo_link}`, 'info');
      }
      return true;
    } catch (error) {
      showToast(error.message || 'Failed to send magic link', 'error');
      return false;
    }
  }

  // Verify magic link token
  async verifyMagicLink(token) {
    try {
      const data = await api.verifyMagicLink(token);
      this.user = data.user;
      this.isAuthenticated = true;
      this.notify();
      showToast('Logged in via magic link!', 'success');
      return true;
    } catch (error) {
      showToast(error.message || 'Invalid or expired magic link', 'error');
      return false;
    }
  }

  // Logout
  async logout() {
    try {
      await api.logout();
      this.user = null;
      this.isAuthenticated = false;
      this.notify();
      showToast('Logged out', 'info');
      return true;
    } catch (error) {
      showToast(error.message || 'Logout failed', 'error');
      return false;
    }
  }

  // Get wallet balance
  getWalletBalance() {
    return this.user?.wallet_cents || 0;
  }

  // Update wallet balance (after topup or purchase)
  updateWalletBalance(newBalance) {
    if (this.user) {
      this.user.wallet_cents = newBalance;
      this.notify();
    }
  }

  // Check if user needs to login
  requireAuth() {
    if (!this.isAuthenticated) {
      showToast('Please log in to continue', 'info');
      window.location.hash = '#/login';
      return false;
    }
    return true;
  }
}

// Create and export singleton instance
const auth = new AuthManager();
export default auth;

