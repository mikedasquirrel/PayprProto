(function(){
  function toast(msg){
    let el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    Object.assign(el.style, {position:'fixed', bottom:'20px', right:'20px', background:'#1A1D24', color:'#fff', padding:'10px 14px', borderRadius:'10px', border:'1px solid rgba(255,255,255,.1)', zIndex:9999});
    document.body.appendChild(el);
    setTimeout(()=>{ el.remove(); }, 2400);
  }

  function getCsrf(){
    const m = document.querySelector('meta[name="csrf-token"]');
    return m ? m.getAttribute('content') : '';
  }

  async function postJSON(url, body){
    let res = await fetch(url, {
      method:'POST',
      headers:{'Content-Type':'application/json','X-CSRFToken': getCsrf()},
      credentials:'same-origin',
      body: JSON.stringify(body||{})
    });
    if(res.status===401 || res.status===403 || res.status===419){
      window.location.href = '/login/magic';
      return {};
    }
    let data = await res.json().catch(()=>({}));
    if(!res.ok) throw Object.assign(new Error(data.error||'Request failed'), {status:res.status, data});
    return data;
  }

  function showHint(msg){
    let el = document.querySelector('.page-hint');
    if(!el){
      el = document.createElement('div');
      el.className = 'page-hint';
      document.body.appendChild(el);
    }
    el.textContent = msg; el.classList.add('show');
  }
  function hideHint(){
    const el = document.querySelector('.page-hint');
    if(el) el.classList.remove('show');
  }

  async function refundLast(articleId){
    try{
      const btn = document.getElementById('request-refund');
      const txnId = btn && btn.getAttribute('data-txn');
      if(!txnId){ throw new Error('Missing transaction id'); }
      const res = await postJSON('/api/refund', {transaction_id: parseInt(txnId,10)});
      toast(`Refund processed • Balance $${(res.balance_cents/100).toFixed(2)}`);
      const walletLink = document.querySelector('a[href="/wallet"]');
      if(walletLink){ walletLink.textContent = `Wallet: $${(res.balance_cents/100).toFixed(2)}`; }
      const countdown = document.getElementById('refund-countdown');
      if(countdown){ countdown.style.animation = 'fadeout 600ms ease forwards'; }
    }catch(err){
      toast(err.data && err.data.error ? err.data.error : 'Refund failed');
    }
  }

  function startRefundCountdown(seconds){
    const el = document.getElementById('refund-countdown');
    if(!el) return;
    let rem = seconds;
    const tick = ()=>{
      const m = String(Math.floor(rem/60)).padStart(2,'0');
      const s = String(rem%60).padStart(2,'0');
      el.textContent = `${m}:${s}`;
      el.classList.remove('warning','danger');
      if(rem <= 60) el.classList.add('danger');
      else if(rem <= 300) el.classList.add('warning');
      if(rem<=0){
        const btn = document.getElementById('request-refund');
        if(btn){ btn.disabled = true; btn.textContent = 'Refund window closed'; }
        return;
      }
      rem -= 1; setTimeout(tick, 1000);
    };
    tick();
  }

  async function onPayClick(e){
    const btn = e.currentTarget;
    const articleId = btn.getAttribute('data-article');
    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = 'Processing…';
    showHint('Unlocking…');
    try{
      const payRes = await postJSON('/api/pay', {article_id: articleId});
      const verify = await postJSON('/api/verify', {access_token: payRes.access_token, article_id: articleId});
      if(verify.valid){
        const full = document.getElementById('full-article');
        if(full){
          const container = btn.closest('.sheet');
          btn.remove();
          const preview = container.querySelector('.preview');
          if(preview) preview.remove();
          const note = container.querySelector('.small-note');
          if(note) note.remove();
          full.classList.remove('hidden');
          const refundWrap = document.createElement('div');
          refundWrap.style.marginTop = '12px';
          const refundBtn = document.createElement('button');
          refundBtn.className = 'pay-btn';
          refundBtn.id = 'request-refund';
          refundBtn.setAttribute('data-article', articleId);
          refundBtn.setAttribute('data-txn', String(payRes.transaction_id));
          refundBtn.style.background = 'var(--accent2)';
          refundBtn.style.color = '#0f1115';
          refundBtn.textContent = 'Refund last read';
          const refundNote = document.createElement('span');
          refundNote.className = 'small-note';
          refundNote.textContent = 'Available up to 10 minutes after purchase.';
          refundWrap.appendChild(refundBtn);
          refundWrap.appendChild(document.createTextNode(' '));
          refundWrap.appendChild(refundNote);
          container.appendChild(refundWrap);
          if(payRes.split){
            const splitEl = document.getElementById('split-chips');
            if(splitEl){
              splitEl.innerHTML = '';
              Object.entries(payRes.split).forEach(([role, cents])=>{
                const chip = document.createElement('span');
                chip.className = `chip role-${role}`;
                chip.title = `${role}`;
                chip.textContent = `${role} $${(cents/100).toFixed(2)}`;
                splitEl.appendChild(chip);
                splitEl.appendChild(document.createTextNode(' '));
              });
            }
          }
          startRefundCountdown(10*60);
        }
        toast(`Unlocked — $${(payRes.price_cents/100).toFixed(2)} • Balance $${(payRes.balance_cents/100).toFixed(2)}`);
      } else {
        toast('Verification failed');
      }
    } catch(err){
      toast(err.data && err.data.error ? err.data.error : 'Payment failed');
    } finally {
      hideHint();
      btn.disabled = false;
      btn.textContent = orig;
    }
  }

  async function onStripeTopupClick(e){
    const btn = e.currentTarget;
    const amount = parseInt(btn.getAttribute('data-topup-stripe'), 10);
    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = 'Processing…';
    try{
      const res = await postJSON('/wallet/topup/stripe', {amount_cents: amount});
      toast(`Wallet topped up — $${(amount/100).toFixed(2)} • Balance $${(res.balance_cents/100).toFixed(2)}`);
      const walletLink = document.querySelector('a[href="/wallet"]');
      if(walletLink){ walletLink.textContent = `Wallet: $${(res.balance_cents/100).toFixed(2)}`; }
    } catch(err){
      toast(err.data && err.data.error ? err.data.error : 'Top-up failed');
    } finally {
      btn.disabled = false;
      btn.textContent = orig;
    }
  }

  document.addEventListener('click', function(e){
    if(e.target && e.target.matches('.pay-btn[data-article]')){
      onPayClick(e);
    }
    if(e.target && e.target.matches('[data-topup-stripe]')){
      onStripeTopupClick(e);
    }
    if(e.target && e.target.matches('#request-refund')){
      const articleId = e.target.getAttribute('data-article');
      refundLast(articleId);
    }
  });

  // Newsstand Load More
  (function(){
    const shelf = document.querySelector('.shelf[role="list"]');
    const btn = document.createElement('button');
    if(!shelf) return;
    btn.className = 'pay-btn'; btn.textContent = 'Load more';
    btn.style.margin = '12px auto';
    let offset = shelf.children.length;
    const params = new URLSearchParams(location.search);
    const q = params.get('q')||''; const category = params.get('category')||'';
    const load = async ()=>{
      btn.disabled = true; const orig = btn.textContent; btn.textContent = 'Loading…';
      try{
        const u = `/api/publishers?offset=${offset}&limit=12&q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}`;
        const res = await fetch(u, {credentials:'same-origin'});
        const data = await res.json();
        (data.items||[]).forEach(p=>{
          const a = document.createElement('a');
          a.className = 'mag'; a.href = `/p/${p.slug}`; a.setAttribute('role','listitem'); a.style.borderColor = p.accent_color||'rgba(255,255,255,.06)';
          a.innerHTML = `<div class="mag-spine"></div><img class="mag-cover" src="${p.hero_url||''}" alt="${p.name}"><div class="mag-title">${p.name}</div>${p.category?`<div class=\"chip\" style=\"margin-top:6px\">${p.category}</div>`:''}`;
          shelf.appendChild(a);
        });
        offset += (data.items||[]).length;
        if(!data.items || !data.items.length){ btn.remove(); }
      }catch(e){ toast('Nothing more to load'); btn.remove(); }
      finally{ if(btn){ btn.disabled = false; btn.textContent = orig; } }
    };
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%'; wrapper.style.display = 'flex'; wrapper.style.justifyContent = 'center'; wrapper.appendChild(btn);
    shelf.parentElement.appendChild(wrapper);
    btn.addEventListener('click', load);
  })();

  // Reading progress bar (percentage of scroll within article)
  (function(){
    const progress = document.getElementById('read-progress');
    const container = document.querySelector('article.sheet');
    if(progress && container){
      const onScroll = ()=>{
        const rect = container.getBoundingClientRect();
        const total = container.scrollHeight - window.innerHeight;
        const scrolled = Math.min(Math.max(window.scrollY - container.offsetTop, 0), total);
        const pct = total > 0 ? Math.round((scrolled/total)*100) : 0;
        progress.textContent = `${pct}%`;
      };
      window.addEventListener('scroll', onScroll, {passive:true});
      onScroll();
    }
  })();
})();
