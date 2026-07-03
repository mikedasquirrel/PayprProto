// Developers landing — the honest positioning of paypr as a metered access layer.
import { ensureDevStyles, codeBlock } from './_dev_shared.js';

export async function renderDevelopers() {
  ensureDevStyles();
  const content = document.getElementById('content');

  const quickstart = `# 1 · confirm your key
curl https://paypr.pro/api/v1/me \\
  -H "Authorization: Bearer sk_test_your_key"

# 2 · register a piece — a unit of value (an article, a finding, one model run)
curl -X POST https://paypr.pro/api/v1/pieces \\
  -H "Authorization: Bearer sk_test_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Sentiment run v2","price_cents":25,"unit_label":"run"}'

# 3 · meter a charge against a reader who authorized your app
curl -X POST https://paypr.pro/api/v1/charges \\
  -H "Authorization: Bearer sk_test_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"reader_email":"reader@example.com","piece_id":123,"idempotency_key":"run-8f3a"}'

# → { "ok": true, "charge_id": 42, "access_token": "eyJ…",
#     "price_cents": 25, "reader_balance_cents": 475,
#     "split": { "publisher": 23, "platform": 2 } }`;

  content.innerHTML = `
    <div class="dev-wrap">
      <div class="dev-hero">
        <div class="dev-eyebrow">paypr for developers</div>
        <h1>One wallet. Charged by the piece.<br>A money rail you can build on.</h1>
        <p class="lede">
          paypr is a <strong>metered access layer</strong>: a reader funds a single wallet once and
          spends it a few cents at a time across every project on the rail. Your app keeps its own
          content, model, and UX — paypr holds the wallet, moves money by the piece, splits it to
          everyone owed, and proves access. Not a reseller. A rail.
        </p>
        <div class="dev-actions">
          <a href="#/developers/console" class="btn btn-primary">Open the developer console</a>
          <a href="#/developers/reference" class="btn btn-secondary">API reference</a>
        </div>
      </div>

      <div class="dev-section">
        <h2>The five nouns</h2>
        <p class="sub">The whole model, once. Everything in the API is one of these.</p>
        <div class="dev-grid">
          <div class="dev-card"><div class="num">01</div><h3>Reader</h3><p>A wallet with a balance. Funds it once, spends by the piece across every app on the rail.</p></div>
          <div class="dev-card"><div class="num">02</div><h3>Piece</h3><p>An atomic unit of paid value — an article, a research finding, one compute run. It has a price and a split.</p></div>
          <div class="dev-card"><div class="num">03</div><h3>App</h3><p>Your project, registered as a creator with its own API keys and a real, payable ledger balance.</p></div>
          <div class="dev-card"><div class="num">04</div><h3>Charge</h3><p>A metered debit: the reader pays for a piece or a run, atomically, and the split lands in the ledger.</p></div>
          <div class="dev-card"><div class="num">05</div><h3>Ledger</h3><p>The append-only journal. Every balance move is an entry, so wallets and earnings always reconcile.</p></div>
        </div>
      </div>

      <div class="dev-section">
        <h2>Three ways to build</h2>
        <div class="dev-grid">
          <div class="dev-card">
            <h3>Server-to-server</h3>
            <p>Your backend holds an <span class="mono">sk_</span> key, registers pieces, and meters charges. No secrets in the browser. The cleanest control — recommended for tools and model endpoints.</p>
          </div>
          <div class="dev-card">
            <h3>Client drop-in</h3>
            <p>Render a preview and an unlock button; on click, pay then verify and reveal. Good for documents and articles where the reader is present.</p>
          </div>
          <div class="dev-card">
            <h3>External verify</h3>
            <p>Gate content on <em>your</em> origin: after a charge, hand your server the returned <span class="mono">access_token</span> and confirm it at <span class="mono">/paypr/unlock</span>. Reveal only if valid.</p>
          </div>
        </div>
      </div>

      <div class="dev-section">
        <h2>Quickstart — meter a charge in three calls</h2>
        <p class="sub">
          Create an app and a key in the <a href="#/developers/console">developer console</a>, have a
          reader authorize your app (a one-line grant with a daily cap), then:
        </p>
        ${codeBlock(quickstart, 'bash')}
        <p class="sub" style="margin-top:1rem">
          A charge either references a <span class="mono">piece_id</span> (charges the piece's price and split)
          or an ad-hoc <span class="mono">amount_cents</span> for pure pay-per-compute. Same atomic debit, same
          ledger, same refund path.
        </p>
      </div>

      <div class="dev-section">
        <h2>The guarantees your integration can rely on</h2>
        <div class="dev-grid">
          <div class="dev-card"><h3>No overspend</h3><p>Every debit is a single atomic conditional update. A balance can't go negative; two concurrent charges can't spend the same funds.</p></div>
          <div class="dev-card"><h3>Exact splits</h3><p>A price divides to the cent by largest-remainder. No cent is ever created or lost across author, app, and platform.</p></div>
          <div class="dev-card"><h3>Idempotent charges</h3><p>Pass an <span class="mono">idempotency_key</span>; a retry returns the original charge instead of debiting twice.</p></div>
          <div class="dev-card"><h3>Clean refunds</h3><p>A refund returns the reader's money and reverses every payee leg in one transaction — no phantom earnings survive.</p></div>
          <div class="dev-card"><h3>Reader-authorized</h3><p>An app can only charge a wallet the reader explicitly granted, bounded by a daily cap the reader sets.</p></div>
          <div class="dev-card"><h3>Reconciled</h3><p>Wallet and earnings are always <span class="mono">SUM(ledger)</span>. Trust the journal, not a mutable counter.</p></div>
        </div>
        <div class="dev-actions">
          <a href="#/developers/console" class="btn btn-primary">Create your first app</a>
          <a href="#/developers/reference" class="btn btn-secondary">Read the full reference</a>
        </div>
      </div>
    </div>
  `;
  window.scrollTo(0, 0);
}

export default renderDevelopers;
