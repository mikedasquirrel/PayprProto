// Developer console — register apps, mint/rotate/revoke API keys, manage the
// reader grants that authorize metered charges. Session-authed (owner = reader).
import api from '../api.js';
import auth from '../auth.js';
import { showToast } from '../components/toast.js';
import { ensureDevStyles, esc, money, codeBlock } from './_dev_shared.js';

const state = { apps: [], grants: [], loading: true, lastSecret: null };

export async function renderDeveloperConsole() {
  ensureDevStyles();
  const content = document.getElementById('content');

  if (!auth.isAuthenticated) {
    content.innerHTML = `
      <div class="dev-wrap">
        <div class="empty-state">
          <div class="empty-icon">🔑</div>
          <h2 class="empty-message">Log in to build on paypr</h2>
          <p style="color: var(--smoke); margin-bottom: 1.5rem;">The developer console is tied to your paypr account — your apps and keys live there.</p>
          <a href="#/login" class="btn btn-primary">Log in</a>
        </div>
      </div>`;
    return;
  }

  content.innerHTML = `<div class="dev-wrap"><div class="loading-state"><div class="spinner"></div><p>Loading your apps…</p></div></div>`;
  await load();
}

async function load() {
  state.loading = true;
  try {
    const [apps, grants] = await Promise.all([api.listApps(), api.listGrants()]);
    state.apps = apps.apps || [];
    state.grants = grants.grants || [];
  } catch (e) {
    showToast(e.message || 'Failed to load console', 'error');
    state.apps = state.apps || [];
  }
  state.loading = false;
  draw();
}

function keyRow(k) {
  return `
    <tr>
      <td class="mono">${esc(k.prefix)}…${esc(k.last4)}</td>
      <td><span class="pill ${k.mode}">${esc(k.mode)}</span></td>
      <td>${k.label ? esc(k.label) : '<span style="color:var(--smoke)">—</span>'}</td>
      <td>${k.active ? '<span class="pill on">active</span>' : '<span class="pill off">revoked</span>'}</td>
      <td style="text-align:right; white-space:nowrap;">
        ${k.active ? `
          <button class="btn btn-sm btn-secondary" data-rotate="${k.id}">Rotate</button>
          <button class="btn btn-sm" style="color:#fda4af" data-revoke-key="${k.id}">Revoke</button>` : ''}
      </td>
    </tr>`;
}

function appCard(a) {
  const chargeSnippet = `curl -X POST https://paypr.pro/api/v1/charges \\
  -H "Authorization: Bearer sk_test_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"reader_email":"reader@example.com","amount_cents":25}'`;
  return `
    <div class="dev-card" style="margin-bottom:1rem">
      <div style="display:flex; align-items:baseline; gap:.6rem; flex-wrap:wrap;">
        <h3 style="margin:0">${esc(a.name)}</h3>
        <span class="mono" style="color:var(--smoke); font-size:.85rem">${esc(a.slug)}</span>
        <span style="margin-left:auto; font-size:.85rem; color:var(--smoke)">Earned <strong style="color:inherit">${money(a.earned_cents)}</strong></span>
      </div>
      ${a.description ? `<p style="margin:.4rem 0 0">${esc(a.description)}</p>` : ''}
      <div style="margin-top:1rem; display:flex; gap:.5rem; align-items:center; flex-wrap:wrap;">
        <strong style="font-size:.9rem">API keys</strong>
        <button class="btn btn-sm btn-primary" data-newkey="${a.id}" data-mode="test">+ Test key</button>
        <button class="btn btn-sm btn-secondary" data-newkey="${a.id}" data-mode="live">+ Live key</button>
      </div>
      ${(a.keys && a.keys.length) ? `
        <table class="dev-table" style="margin-top:.6rem">
          <thead><tr><th>Key</th><th>Mode</th><th>Label</th><th>Status</th><th></th></tr></thead>
          <tbody>${a.keys.map(keyRow).join('')}</tbody>
        </table>` : `<p style="color:var(--smoke); font-size:.9rem; margin-top:.5rem">No keys yet — mint one to start charging.</p>`}
      <details style="margin-top:1rem">
        <summary style="cursor:pointer; color:var(--smoke); font-size:.88rem">Charge a reader with this app</summary>
        <p style="color:var(--smoke); font-size:.86rem; margin:.6rem 0 0">The reader must first authorize your app below. Then, server-side:</p>
        ${codeBlock(chargeSnippet, 'bash')}
      </details>
    </div>`;
}

function draw() {
  const content = document.getElementById('content');
  const revealHtml = state.lastSecret ? `
    <div class="reveal">
      <div class="lbl">🔑 Secret key for “${esc(state.lastSecret.appName)}” — copy it now, it won't be shown again</div>
      ${codeBlock(state.lastSecret.secret)}
      <button class="btn btn-sm btn-secondary" id="dismiss-secret">Done</button>
    </div>` : '';

  content.innerHTML = `
    <div class="dev-wrap">
      <div class="dev-hero" style="padding-top:2rem">
        <div class="dev-eyebrow">Developer console</div>
        <h1 style="font-size:2rem">Your apps &amp; keys</h1>
        <p class="lede" style="font-size:1.05rem">Register an app, mint API keys, and manage which apps may meter your wallet.</p>
        <div class="dev-actions">
          <a href="#/developers" class="btn btn-secondary">Overview</a>
          <a href="#/developers/reference" class="btn btn-secondary">API reference</a>
        </div>
      </div>

      ${revealHtml}

      <div class="dev-section">
        <h2>Register an app</h2>
        <p class="sub">Each app gets its own creator account, so earnings accrue to a real, payable ledger balance.</p>
        <div class="dev-card">
          <div class="form-group"><label class="form-label" for="app-name">App name</label>
            <input class="form-input" id="app-name" placeholder="e.g. Resonance, Sentiment API, do-ai-know-you" /></div>
          <div class="form-group"><label class="form-label" for="app-desc">Description <span style="color:var(--smoke)">(optional)</span></label>
            <input class="form-input" id="app-desc" placeholder="What does it charge for?" /></div>
          <div class="form-group"><label class="form-label" for="app-url">Website <span style="color:var(--smoke)">(optional)</span></label>
            <input class="form-input" id="app-url" placeholder="https://…" /></div>
          <button class="btn btn-primary" id="create-app">Create app</button>
        </div>
      </div>

      <div class="dev-section">
        <h2>Apps</h2>
        ${state.apps.length ? state.apps.map(appCard).join('') :
          `<p style="color:var(--smoke)">No apps yet. Register one above to get your keys.</p>`}
      </div>

      <div class="dev-section">
        <h2>Apps you've authorized to charge you</h2>
        <p class="sub">A grant lets an app meter your wallet up to a daily cap. Revoke any time.</p>
        <div class="dev-card">
          <div style="display:grid; grid-template-columns:1fr 160px auto; gap:.6rem; align-items:end;">
            <div class="form-group" style="margin:0"><label class="form-label" for="grant-slug">App slug</label>
              <input class="form-input" id="grant-slug" placeholder="resonance" /></div>
            <div class="form-group" style="margin:0"><label class="form-label" for="grant-cap">Daily cap ($)</label>
              <input class="form-input" id="grant-cap" type="number" min="0" step="0.5" value="5" /></div>
            <button class="btn btn-primary" id="create-grant">Authorize</button>
          </div>
        </div>
        ${state.grants.length ? `
          <table class="dev-table" style="margin-top:1rem">
            <thead><tr><th>App</th><th>Slug</th><th>Daily cap</th><th></th></tr></thead>
            <tbody>${state.grants.map(g => `
              <tr>
                <td>${esc(g.app_name)}</td>
                <td class="mono" style="color:var(--smoke)">${esc(g.app_slug)}</td>
                <td>${money(g.daily_cap_cents)}</td>
                <td style="text-align:right"><button class="btn btn-sm" style="color:#fda4af" data-revoke-grant="${g.id}">Revoke</button></td>
              </tr>`).join('')}</tbody>
          </table>` : `<p style="color:var(--smoke); font-size:.9rem; margin-top:.75rem">No active grants.</p>`}
      </div>
    </div>
  `;
  wire();
  window.scrollTo(0, 0);
}

function wire() {
  const $ = (id) => document.getElementById(id);

  $('dismiss-secret')?.addEventListener('click', () => { state.lastSecret = null; draw(); });

  $('create-app')?.addEventListener('click', async (e) => {
    const name = $('app-name').value.trim();
    if (!name) return showToast('Give your app a name', 'warning');
    e.target.disabled = true;
    try {
      await api.createApp({ name, description: $('app-desc').value.trim(), website_url: $('app-url').value.trim() });
      showToast('App created', 'success');
      await load();
    } catch (err) { showToast(err.message || 'Could not create app', 'error'); e.target.disabled = false; }
  });

  document.querySelectorAll('[data-newkey]').forEach(btn => btn.addEventListener('click', async () => {
    const appId = btn.dataset.newkey, mode = btn.dataset.mode;
    const app = state.apps.find(a => String(a.id) === String(appId));
    btn.disabled = true;
    try {
      const res = await api.issueKey(appId, { mode });
      state.lastSecret = { secret: res.secret, appName: app ? app.name : 'app' };
      showToast(`${mode} key created`, 'success');
      await load();
    } catch (err) { showToast(err.message || 'Could not create key', 'error'); btn.disabled = false; }
  }));

  document.querySelectorAll('[data-rotate]').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Rotate this key? The old key stops working immediately.')) return;
    btn.disabled = true;
    try {
      const res = await api.rotateKey(btn.dataset.rotate);
      const app = state.apps.find(a => (a.keys || []).some(k => String(k.id) === String(btn.dataset.rotate)));
      state.lastSecret = { secret: res.secret, appName: app ? app.name : 'app' };
      showToast('Key rotated', 'success');
      await load();
    } catch (err) { showToast(err.message || 'Could not rotate', 'error'); btn.disabled = false; }
  }));

  document.querySelectorAll('[data-revoke-key]').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Revoke this key? This cannot be undone.')) return;
    btn.disabled = true;
    try { await api.revokeKey(btn.dataset.revokeKey); showToast('Key revoked', 'success'); await load(); }
    catch (err) { showToast(err.message || 'Could not revoke', 'error'); btn.disabled = false; }
  }));

  $('create-grant')?.addEventListener('click', async (e) => {
    const slug = $('grant-slug').value.trim();
    if (!slug) return showToast('Enter an app slug', 'warning');
    const cap = Math.round(parseFloat($('grant-cap').value || '0') * 100);
    e.target.disabled = true;
    try { await api.createGrant({ app_slug: slug, daily_cap_cents: cap }); showToast('App authorized', 'success'); await load(); }
    catch (err) { showToast(err.message || 'Could not authorize', 'error'); e.target.disabled = false; }
  });

  document.querySelectorAll('[data-revoke-grant]').forEach(btn => btn.addEventListener('click', async () => {
    btn.disabled = true;
    try { await api.revokeGrant(btn.dataset.revokeGrant); showToast('Grant revoked', 'success'); await load(); }
    catch (err) { showToast(err.message || 'Could not revoke', 'error'); btn.disabled = false; }
  }));
}

export default renderDeveloperConsole;
