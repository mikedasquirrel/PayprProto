// Author Content Submission Page
import api from '../api.js';
import auth from '../auth.js';
import router from '../router.js';
import { showToast } from '../components/toast.js';

export async function renderAuthorSubmit() {
  const content = document.getElementById('content');

  if (!auth.isAuthenticated) {
    router.navigate('/login');
    return;
  }

  // Check if user has author profile
  let authorProfile;
  try {
    authorProfile = await api.getAuthorProfile();
  } catch (error) {
    router.navigate('/author/dashboard');
    return;
  }

  // Fetch publishers for dropdown
  let publishers = [];
  try {
    const publishersData = await api.getPublishers({ limit: 100 });
    publishers = publishersData.items || [];
  } catch (error) {
    console.error('Error loading publishers:', error);
  }

  content.innerHTML = `
    <div class="container" style="max-width: 900px; padding: 3rem 1.5rem;">
      <div style="margin-bottom: 2rem;">
        <a href="#/author/dashboard" class="btn btn-sm btn-secondary">
          ← Back to Dashboard
        </a>
      </div>

      <div class="card">
        <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 1rem;">
          Submit New Article
        </h1>
        <p style="color: var(--fog); margin-bottom: 2rem;">
          Create and publish your content. Set your own price and choose your publishing model.
        </p>

        <form id="submit-form">
          <div class="form-group">
            <label class="form-label" for="title">Article Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              class="form-input"
              placeholder="Enter a compelling title..."
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="dek">Subtitle/Dek *</label>
            <textarea
              id="dek"
              name="dek"
              class="form-input"
              placeholder="A brief description or subtitle..."
              rows="2"
              required
            ></textarea>
          </div>

          <div class="form-group">
            <label class="form-label" for="cover_url">Cover Image URL (optional)</label>
            <input
              type="url"
              id="cover_url"
              name="cover_url"
              class="form-input"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="body_html">Article Content *</label>
            <textarea
              id="body_html"
              name="body_html"
              class="form-input"
              placeholder="Write your article content here (HTML supported)..."
              rows="15"
              required
              style="font-family: var(--font-mono); font-size: 0.875rem;"
            ></textarea>
            <div style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--smoke);">
              💡 Tip: You can use HTML tags like &lt;p&gt;, &lt;h2&gt;, &lt;strong&gt;, etc.
            </div>
          </div>

          <div class="grid grid-2">
            <div class="form-group">
              <label class="form-label" for="price_cents">Price</label>
              <select id="price_cents" name="price_cents" class="form-input">
                <option value="49">$0.49</option>
                <option value="99" ${authorProfile.default_price_cents === 99 ? 'selected' : ''}>$0.99</option>
                <option value="149">$1.49</option>
                <option value="199" ${authorProfile.default_price_cents === 199 ? 'selected' : ''}>$1.99</option>
                <option value="299">$2.99</option>
                <option value="499">$4.99</option>
                <option value="999">$9.99</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="media_type">Content Type</label>
              <select id="media_type" name="media_type" class="form-input">
                <option value="html">Article (HTML)</option>
                <option value="audio">Audio/Podcast</option>
                <option value="pdf">PDF Document</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="publisher_id">Publisher (optional)</label>
            <select id="publisher_id" name="publisher_id" class="form-input">
              <option value="">Independent (publish on your own)</option>
              ${publishers.map(pub => `
                <option value="${pub.id}">${pub.name} - ${pub.category || 'General'}</option>
              `).join('')}
            </select>
            <div style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--smoke);">
              Publishing through a publisher may give you wider reach but involves revenue sharing
            </div>
          </div>

          <div class="form-group" id="license-group" style="display: none;">
            <label class="form-label" for="license_type">License Type</label>
            <select id="license_type" name="license_type" class="form-input">
              <option value="revenue_share">Revenue Share (you keep 60%, publisher 30%)</option>
              <option value="buyout">One-time Buyout (publisher pays upfront)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="status">Status</label>
            <select id="status" name="status" class="form-input">
              <option value="published">Publish Immediately</option>
              <option value="draft">Save as Draft</option>
            </select>
          </div>

          <div style="display: flex; gap: 1rem; margin-top: 2rem;">
            <button type="submit" class="btn btn-primary" style="flex: 1;">
              Submit Article
            </button>
            <button type="button" class="btn btn-secondary" onclick="window.location.hash='#/author/dashboard'">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Setup form
  const form = document.getElementById('submit-form');
  const publisherSelect = document.getElementById('publisher_id');
  const licenseGroup = document.getElementById('license-group');

  // Show/hide license options based on publisher selection
  publisherSelect.addEventListener('change', () => {
    if (publisherSelect.value) {
      licenseGroup.style.display = 'block';
    } else {
      licenseGroup.style.display = 'none';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    const formData = {
      title: form.title.value.trim(),
      dek: form.dek.value.trim(),
      cover_url: form.cover_url.value.trim() || undefined,
      body_html: form.body_html.value.trim(),
      body_preview: form.body_html.value.trim().substring(0, 500),
      price_cents: parseInt(form.price_cents.value, 10),
      media_type: form.media_type.value,
      publisher_id: form.publisher_id.value ? parseInt(form.publisher_id.value, 10) : undefined,
      license_type: form.publisher_id.value ? form.license_type.value : 'independent',
      status: form.status.value
    };

    try {
      const result = await api.submitContent(formData);
      
      showToast('Article submitted successfully!', 'success');
      
      // Redirect to dashboard
      setTimeout(() => {
        router.navigate('/author/dashboard');
      }, 1000);

    } catch (error) {
      showToast(error.message || 'Submission failed', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Article';
    }
  });
}

export default renderAuthorSubmit;

