// API Client - Centralized fetch wrapper
class APIClient {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
      credentials: 'same-origin',
    };

    try {
      const response = await fetch(url, config);
      
      // Handle different content types
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const error = new Error(data.error || `HTTP ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Public APIs
  async getPublishers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/publishers${query ? '?' + query : ''}`);
  }

  async getPublisher(slug) {
    return this.get(`/publishers/${slug}`);
  }

  async getArticles(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/articles${query ? '?' + query : ''}`);
  }

  async getArticle(id) {
    return this.get(`/articles/${id}`);
  }

  async getCategories() {
    return this.get('/categories');
  }

  async submitContact(data) {
    return this.post('/contact', data);
  }

  // Auth APIs
  async login(email) {
    return this.post('/auth/login', { email });
  }

  async requestMagicLink(email) {
    return this.post('/auth/magic-link/request', { email });
  }

  async verifyMagicLink(token) {
    return this.post('/auth/magic-link/verify', { token });
  }

  async logout() {
    return this.post('/auth/logout', {});
  }

  async getCurrentUser() {
    return this.get('/auth/me');
  }

  // Account APIs
  async getWallet() {
    return this.get('/account/wallet');
  }

  async topupWallet(amountCents) {
    return this.post('/account/topup', { amount_cents: amountCents });
  }

  async topupWalletStripe(amountCents) {
    return this.post('/account/topup/stripe', { amount_cents: amountCents });
  }

  async createCheckoutSession(amountCents) {
    return this.post('/account/topup/checkout', { amount_cents: amountCents });
  }

  async verifyCheckoutSession(sessionId) {
    return this.post('/account/topup/verify-session', { session_id: sessionId });
  }

  async getTransactions() {
    return this.get('/account/transactions');
  }

  // Payment APIs
  async payForArticle(articleId) {
    return this.post('/pay', { article_id: articleId });
  }

  async verifyPayment(accessToken, articleId) {
    return this.post('/verify', { access_token: accessToken, article_id: articleId });
  }

  async refundTransaction(transactionId) {
    return this.post('/refund', { transaction_id: transactionId });
  }

  // Publisher APIs
  async getPublisherStats() {
    return this.get('/publisher/console/stats');
  }

  async getPublisherTransactions(format = 'json') {
    return this.get(`/publisher/console/transactions?format=${format}`);
  }

  async getPublisherArticles() {
    return this.get('/publisher/console/articles');
  }

  // Admin APIs
  async adminLogin(username, password) {
    return this.post('/admin/auth/login', { username, password });
  }

  async adminLogout() {
    return this.post('/admin/auth/logout', {});
  }

  async getTheme() {
    return this.get('/admin/theme');
  }

  async updateTheme(data) {
    return this.put('/admin/theme', data);
  }

  async getSiteSettings() {
    return this.get('/admin/site');
  }

  async updateSiteSettings(data) {
    return this.put('/admin/site', data);
  }

  async getSplitRules(publisherId) {
    return this.get(`/admin/splits/${publisherId}`);
  }

  async updateSplitRules(publisherId, rules) {
    return this.put(`/admin/splits/${publisherId}`, { rules });
  }

  // Author APIs
  async registerAuthor(data) {
    return this.post('/author/register', data);
  }

  async getAuthorProfile() {
    return this.get('/author/profile');
  }

  async getAuthorProfilePublic(authorId) {
    return this.get(`/author/profile/${authorId}`);
  }

  async updateAuthorProfile(data) {
    return this.put('/author/profile', data);
  }

  async getAuthorContent(status = '') {
    const query = status ? `?status=${status}` : '';
    return this.get(`/author/content${query}`);
  }

  async submitContent(data) {
    return this.post('/author/content/submit', data);
  }

  async updateContent(articleId, data) {
    return this.put(`/author/content/${articleId}`, data);
  }

  async deleteContent(articleId) {
    return this.delete(`/author/content/${articleId}`);
  }

  async getAuthorEarnings() {
    return this.get('/author/earnings');
  }

  // Showcase APIs
  async getShowcaseSite(slug) {
    return fetch(`/showcase/${slug}`).then(r => r.json());
  }

  async getShowcaseContent(slug, params = {}) {
    const query = new URLSearchParams(params).toString();
    return fetch(`/showcase/${slug}/content${query ? '?' + query : ''}`).then(r => r.json());
  }

  async getShowcaseStats(slug) {
    return fetch(`/showcase/${slug}/stats`).then(r => r.json());
  }

  // ===== Developer platform (v1) =====
  // The machine-facing rail lives under /api/v1. Owner-facing calls below use the
  // session cookie (same-origin); the server-to-server surface (pieces/charges)
  // is authenticated with an sk_ API key and is meant to be called from a backend.
  async v1(endpoint, options = {}) {
    const config = {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      credentials: 'same-origin',
    };
    const resp = await fetch(`/api/v1${endpoint}`, config);
    const ct = resp.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await resp.json() : await resp.text();
    if (!resp.ok) {
      const err = new Error((data && data.error) || `HTTP ${resp.status}`);
      err.status = resp.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  listApps() { return this.v1('/apps'); }
  createApp(data) { return this.v1('/apps', { method: 'POST', body: JSON.stringify(data) }); }
  getApp(id) { return this.v1(`/apps/${id}`); }
  issueKey(appId, data) { return this.v1(`/apps/${appId}/keys`, { method: 'POST', body: JSON.stringify(data || {}) }); }
  revokeKey(keyId) { return this.v1(`/keys/${keyId}/revoke`, { method: 'POST', body: '{}' }); }
  rotateKey(keyId) { return this.v1(`/keys/${keyId}/rotate`, { method: 'POST', body: '{}' }); }
  listGrants() { return this.v1('/grants'); }
  createGrant(data) { return this.v1('/grants', { method: 'POST', body: JSON.stringify(data) }); }
  revokeGrant(id) { return this.v1(`/grants/${id}/revoke`, { method: 'POST', body: '{}' }); }
}

// Create and export singleton instance
const api = new APIClient();
export default api;

