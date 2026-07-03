// Shared helpers + scoped styles for the Developers / API realm.
import { showToast } from '../components/toast.js';

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function money(cents) {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}

// A code block with a copy button. `text` is the raw payload copied to clipboard.
export function codeBlock(text, lang = '') {
  const id = 'cb_' + Math.random().toString(36).slice(2, 9);
  return `
    <div class="dev-code">
      <button class="dev-copy" data-copy-target="${id}" title="Copy">Copy</button>
      <pre><code id="${id}" data-lang="${esc(lang)}">${esc(text)}</code></pre>
    </div>`;
}

let _wired = false;
export function ensureDevStyles() {
  if (!_wired) {
    // One delegated copy handler for every code block on the site.
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-copy-target]');
      if (!btn) return;
      const el = document.getElementById(btn.dataset.copyTarget);
      if (!el) return;
      const text = el.textContent;
      navigator.clipboard?.writeText(text).then(
        () => { btn.textContent = 'Copied'; showToast('Copied to clipboard', 'success', 1500); setTimeout(() => (btn.textContent = 'Copy'), 1200); },
        () => showToast('Copy failed', 'error')
      );
    });
    _wired = true;
  }
  if (document.getElementById('dev-platform-styles')) return;
  const style = document.createElement('style');
  style.id = 'dev-platform-styles';
  style.textContent = `
    .dev-wrap { max-width: 1080px; margin: 0 auto; padding: 2.5rem 1.5rem 5rem; }
    .dev-hero { padding: 3.5rem 0 1.5rem; }
    .dev-hero h1 { font-size: 2.6rem; font-weight: 800; line-height: 1.08; margin-bottom: 1rem; letter-spacing: -0.02em; }
    .dev-hero p.lede { font-size: 1.2rem; color: var(--smoke); max-width: 44rem; line-height: 1.6; }
    .dev-eyebrow { text-transform: uppercase; letter-spacing: .14em; font-size: .74rem; font-weight: 700;
      background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent; margin-bottom: 1rem; }
    .dev-actions { display: flex; gap: .75rem; flex-wrap: wrap; margin-top: 1.75rem; }
    .dev-section { margin-top: 3rem; }
    .dev-section > h2 { font-size: 1.5rem; font-weight: 750; margin-bottom: .35rem; }
    .dev-section > p.sub { color: var(--smoke); margin-bottom: 1.25rem; max-width: 46rem; line-height: 1.6; }
    .dev-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 1rem; }
    .dev-card { border: 1px solid var(--glass-border, rgba(255,255,255,.08)); border-radius: 14px;
      padding: 1.25rem 1.25rem 1.35rem; background: var(--glass-bg, rgba(255,255,255,.02)); }
    .dev-card h3 { font-size: 1.02rem; font-weight: 700; margin: .1rem 0 .4rem; }
    .dev-card p { color: var(--smoke); font-size: .92rem; line-height: 1.55; }
    .dev-card .num { font-size: .78rem; font-weight: 800; color: transparent; background: var(--grad);
      -webkit-background-clip: text; background-clip: text; }
    .dev-code { position: relative; margin: .75rem 0; }
    .dev-code pre { overflow-x: auto; background: #0d1017; border: 1px solid rgba(255,255,255,.08);
      border-radius: 12px; padding: 1rem 1.1rem; margin: 0; }
    .dev-code code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .82rem; line-height: 1.6; color: #d7dce6; white-space: pre; }
    .dev-copy { position: absolute; top: .5rem; right: .5rem; font-size: .72rem; padding: .28rem .6rem;
      border-radius: 7px; border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.06);
      color: #cfd6e4; cursor: pointer; }
    .dev-copy:hover { background: rgba(255,255,255,.14); }
    .dev-table { width: 100%; border-collapse: collapse; font-size: .9rem; }
    .dev-table th, .dev-table td { text-align: left; padding: .6rem .5rem; border-bottom: 1px solid var(--glass-border, rgba(255,255,255,.08)); }
    .dev-table th { color: var(--smoke); font-weight: 600; font-size: .8rem; text-transform: uppercase; letter-spacing: .04em; }
    .pill { display: inline-block; font-size: .72rem; font-weight: 700; padding: .18rem .5rem; border-radius: 999px; letter-spacing: .02em; }
    .pill.test { background: rgba(99,102,241,.16); color: #a5b4fc; }
    .pill.live { background: rgba(16,185,129,.16); color: #6ee7b7; }
    .pill.get { background: rgba(16,185,129,.14); color: #6ee7b7; }
    .pill.post { background: rgba(250,61,127,.16); color: #f9a8c8; }
    .pill.del { background: rgba(244,63,94,.16); color: #fda4af; }
    .pill.on { background: rgba(16,185,129,.16); color: #6ee7b7; }
    .pill.off { background: rgba(148,163,184,.16); color: #cbd5e1; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .reveal { border: 1px solid rgba(16,185,129,.4); background: rgba(16,185,129,.08); border-radius: 12px; padding: 1rem 1.1rem; margin: .75rem 0; }
    .reveal .lbl { font-size: .78rem; color: #6ee7b7; font-weight: 700; margin-bottom: .4rem; }
    .ref-ep { border: 1px solid var(--glass-border, rgba(255,255,255,.08)); border-radius: 12px; padding: 1rem 1.15rem; margin-bottom: .9rem; }
    .ref-ep .sig { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
    .ref-ep .path { font-family: ui-monospace, monospace; font-size: .95rem; font-weight: 650; }
    .ref-ep .auth { margin-left: auto; font-size: .74rem; color: var(--smoke); }
    .ref-ep p.d { color: var(--smoke); font-size: .9rem; margin: .5rem 0 0; line-height: 1.55; }
    .dev-toc { position: sticky; top: 1rem; align-self: start; }
    .dev-toc a { display: block; color: var(--smoke); text-decoration: none; padding: .28rem 0; font-size: .9rem; }
    .dev-toc a:hover { color: var(--paper, #fff); }
    .dev-two { display: grid; grid-template-columns: 200px 1fr; gap: 2rem; }
    @media (max-width: 760px) { .dev-two { grid-template-columns: 1fr; } .dev-toc { position: static; } }
  `;
  document.head.appendChild(style);
}
