// API reference — an accurate, browsable map of the paypr HTTP surface:
// the core reader loop (/api) and the machine-facing developer platform (/api/v1).
import { ensureDevStyles, esc, codeBlock } from './_dev_shared.js';

const SECTIONS = [
  {
    id: 'auth', title: 'Reader auth', blurb: 'Cookie-session auth for a human reader. All wallet/pay calls carry this session.',
    eps: [
      { m: 'POST', p: '/api/auth/login', a: 'public', d: "Start a reader session by email. Creates the user with a 0 starter balance (no free-money faucet).", body: '{ "email": "reader@example.com" }' },
      { m: 'POST', p: '/api/auth/magic-link/request', a: 'public', d: 'Email a magic link (dev also returns demo_link).' },
      { m: 'POST', p: '/api/auth/magic-link/verify', a: 'public', d: 'Exchange a magic-link token for a session.' },
      { m: 'GET', p: '/api/auth/me', a: 'public', d: 'Current session — { authenticated, user? }.' },
    ],
  },
  {
    id: 'wallet', title: 'Wallet', blurb: 'Fund and inspect a reader wallet. Top-ups settle through a signature-verified Stripe webhook.',
    eps: [
      { m: 'GET', p: '/api/account/wallet', a: 'reader', d: 'Balance and email.' },
      { m: 'POST', p: '/api/account/topup/checkout', a: 'reader', d: 'Create a Stripe Checkout session (100–50000¢). Redirect the reader to checkout_url.', body: '{ "amount_cents": 500 }' },
      { m: 'POST', p: '/api/stripe/webhook', a: 'stripe', d: 'Stripe → paypr. Credits the wallet on checkout.session.completed. The real top-up path.' },
      { m: 'GET', p: '/api/account/transactions', a: 'reader', d: 'The reader\'s transaction history.' },
    ],
  },
  {
    id: 'loop', title: 'The core loop', blurb: 'Pay for a piece, prove access, refund within the window.',
    eps: [
      { m: 'POST', p: '/api/pay', a: 'reader', d: 'Atomic debit + exact split into the ledger. Idempotent per (reader, piece). Returns a 10-minute access_token.', body: '{ "article_id": 123 }' },
      { m: 'POST', p: '/api/verify', a: 'reader', d: 'Confirm an access_token matches a piece — { valid }.' },
      { m: 'GET', p: '/paypr/unlock?token=…', a: 'external', d: 'Verify an unlock from your own origin, no session — { valid, article_id, publisher_id }.' },
      { m: 'POST', p: '/api/refund', a: 'reader', d: 'Refund within 10 minutes, once. Returns the money and reverses every payee leg.', body: '{ "transaction_id": 42 }' },
    ],
  },
  {
    id: 'apps', title: 'Apps & keys', blurb: 'Owner-facing, cookie-session. Register apps and manage server-to-server keys. Secrets are shown once.',
    eps: [
      { m: 'POST', p: '/api/v1/apps', a: 'owner', d: 'Register an app; it gets its own creator (publisher) ledger account.', body: '{ "name": "Sentiment API", "description": "charges per run" }' },
      { m: 'GET', p: '/api/v1/apps', a: 'owner', d: 'List your apps with their keys and earnings.' },
      { m: 'POST', p: '/api/v1/apps/:id/keys', a: 'owner', d: 'Mint a key. Response includes the plaintext secret exactly once.', body: '{ "mode": "test", "label": "ci" }' },
      { m: 'POST', p: '/api/v1/keys/:id/rotate', a: 'owner', d: 'Revoke a key and mint its replacement in one call.' },
      { m: 'POST', p: '/api/v1/keys/:id/revoke', a: 'owner', d: 'Revoke a key immediately.' },
    ],
  },
  {
    id: 'grants', title: 'Reader grants', blurb: 'A reader authorizes an app to meter their wallet, bounded by a daily cap.',
    eps: [
      { m: 'POST', p: '/api/v1/grants', a: 'reader', d: 'Authorize an app by slug, with a daily cap in cents.', body: '{ "app_slug": "sentiment-api", "daily_cap_cents": 500 }' },
      { m: 'GET', p: '/api/v1/grants', a: 'reader', d: 'List your active grants.' },
      { m: 'POST', p: '/api/v1/grants/:id/revoke', a: 'reader', d: 'Revoke a grant.' },
    ],
  },
  {
    id: 'machine', title: 'Machine surface', blurb: 'Server-to-server. Authenticate with Authorization: Bearer sk_… — never from a browser.',
    eps: [
      { m: 'GET', p: '/api/v1/me', a: 'key', d: 'Identify the app behind a key — { app, key:{mode,scopes} }.' },
      { m: 'POST', p: '/api/v1/pieces', a: 'key', d: 'Register a unit of value (article, finding, run). Optional split as a bps map.', body: '{ "title": "Run #8", "price_cents": 25, "unit_label": "run" }' },
      { m: 'GET', p: '/api/v1/pieces', a: 'key', d: 'List your app\'s pieces.' },
      { m: 'POST', p: '/api/v1/charges', a: 'key', d: 'Meter a charge against a granting reader. Use piece_id or ad-hoc amount_cents. Idempotent per idempotency_key.', body: '{ "reader_email": "reader@example.com", "amount_cents": 25, "idempotency_key": "run-8f3a" }' },
      { m: 'POST', p: '/api/v1/charges/:id/refund', a: 'key', d: 'Reverse a metered charge within the 10-minute window; reverses every ledger leg.' },
      { m: 'GET', p: '/api/v1/events', a: 'key', d: 'Recent events for your app (charges, etc.).' },
    ],
  },
];

const AUTH_LABEL = {
  public: 'no auth', reader: 'reader session', owner: 'owner session',
  key: 'API key', external: 'token', stripe: 'stripe sig',
};

function epHtml(ep) {
  const cls = ep.m === 'GET' ? 'get' : (ep.m === 'DELETE' ? 'del' : 'post');
  return `
    <div class="ref-ep" id="ep-${esc(ep.p.replace(/[^a-z0-9]+/gi, '-'))}">
      <div class="sig">
        <span class="pill ${cls}">${ep.m}</span>
        <span class="path">${esc(ep.p)}</span>
        <span class="auth">${esc(AUTH_LABEL[ep.a] || ep.a)}</span>
      </div>
      <p class="d">${esc(ep.d)}</p>
      ${ep.body ? codeBlock(ep.body, 'json') : ''}
    </div>`;
}

export async function renderApiReference() {
  ensureDevStyles();
  const content = document.getElementById('content');

  const fullExample = `# a complete server-to-server charge, start to finish
KEY="sk_test_your_key"; BASE="https://paypr.pro"

# who am I?
curl $BASE/api/v1/me -H "Authorization: Bearer $KEY"

# register a piece
curl -X POST $BASE/api/v1/pieces -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Finding 001","price_cents":199,"unit_label":"finding"}'

# meter the charge (reader must have granted your app)
curl -X POST $BASE/api/v1/charges -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"reader_email":"reader@example.com","piece_id":1,"idempotency_key":"f001-a"}'`;

  content.innerHTML = `
    <div class="dev-wrap">
      <div class="dev-hero" style="padding-top:2rem">
        <div class="dev-eyebrow">API reference</div>
        <h1 style="font-size:2rem">The paypr HTTP API</h1>
        <p class="lede" style="font-size:1.05rem">JSON everywhere. The reader loop lives under <span class="mono">/api</span>; the developer platform under <span class="mono">/api/v1</span>. Money endpoints are origin-guarded and rate-limited — call them same-origin or server-side.</p>
        <div class="dev-actions">
          <a href="#/developers" class="btn btn-secondary">Overview</a>
          <a href="#/developers/console" class="btn btn-primary">Developer console</a>
        </div>
      </div>

      <div class="dev-section">
        <h2>A full charge, end to end</h2>
        ${codeBlock(fullExample, 'bash')}
      </div>

      <div class="dev-two" style="margin-top:2.5rem">
        <nav class="dev-toc">
          ${SECTIONS.map(s => `<a href="#/developers/reference?s=${s.id}" onclick="document.getElementById('sec-${s.id}')?.scrollIntoView({behavior:'smooth'});return false;">${esc(s.title)}</a>`).join('')}
        </nav>
        <div>
          ${SECTIONS.map(s => `
            <section id="sec-${s.id}" class="dev-section" style="margin-top:0; margin-bottom:2.5rem">
              <h2>${esc(s.title)}</h2>
              <p class="sub">${esc(s.blurb)}</p>
              ${s.eps.map(epHtml).join('')}
            </section>`).join('')}
        </div>
      </div>
    </div>
  `;
  window.scrollTo(0, 0);
}

export default renderApiReference;
