# External Integration (Beta)

This guide shows how to add a Paypr button to your own site to unlock an article section.

## Reader flow
1. User clicks "Pay" on your page
2. Your site calls `/api/pay` with `{ article_id }`
3. Server responds with `{ access_token, transaction_id, balance_cents }`
4. Your site calls `/api/verify` with `{ access_token, article_id }`
5. If `valid`, reveal content. Optionally offer refund within 10 minutes by POST `/api/refund` with `transaction_id`.

## Minimal example

```html
<div id="locked">Preview…</div>
<div id="unlocked" style="display:none">Full content here…</div>
<button id="pay" data-article="123">Pay 25¢</button>
<script>
async function post(u,b){
  const r = await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify(b)});
  const j = await r.json(); if(!r.ok) throw new Error(j.error||'Request failed'); return j;
}
document.getElementById('pay').addEventListener('click', async (e)=>{
  const id = parseInt(e.target.getAttribute('data-article'),10);
  const pay = await post('/api/pay', {article_id:id});
  const verify = await post('/api/verify', {access_token: pay.access_token, article_id:id});
  if(verify.valid){ document.getElementById('locked').style.display='none'; document.getElementById('unlocked').style.display='block'; }
});
</script>
```

## Refunds

Within 10 minutes of purchase, POST `/api/refund` with the `transaction_id` returned by `/api/pay`.

```bash
curl -X POST http://127.0.0.1:50773/api/refund \
  -H 'Content-Type: application/json' \
  -b cookies.txt -c cookies.txt \
  -d '{"transaction_id": 1234}'
```

## Bookmarklet

Use the bookmarklet at `/bookmarklet` to open a compact Paypr window over any site for quick access to your wallet and the newsstand.

## Webhooks (optional)

For a full production flow, add webhooks to reconcile Stripe events and wallet top-ups:

- `payment_intent.succeeded` → credit user wallet by `amount_received`
- `charge.refunded` → debit wallet or mark refund record (depending on policy)

Sequence overview:

```
User → Site: Click Pay
Site → Paypr: POST /api/pay {article_id}
Paypr → Site: {access_token, transaction_id}
Site → Paypr: POST /api/verify {access_token}
Paypr → Site: {valid:true}
Stripe → Paypr (webhook): payment_intent.succeeded
Paypr → DB: Credit wallet (if using Stripe top-ups)
```

Notes:
- During pilot, wallet top-ups are test-only on server without webhooks.
- For production, configure webhook endpoint (e.g., `/webhooks/stripe`) and verify signatures.


