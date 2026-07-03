# Deploy: Autotuner + Paypr, one PythonAnywhere web app

One web app serves both. **Paypr owns the root** (`/`, `/api/*`, `/account/*`, …) with zero changes to its absolute paths; the **Autotuner lives at `/tuner`** and drives the whole unlock loop same-origin: email sign-in → wallet top-up → 25¢ pay → JWT-verified export. Proven end-to-end locally (login → topup 500¢ → pay → balance 475¢ → gate passes; re-pay is idempotent, bad tokens 402).

## 1 · Get the code up

```bash
# in a PythonAnywhere Bash console — adjust to your git remotes or upload via Files tab
cd ~ && git clone <your-remote>/PayprProto.git PayprProto
cd ~ && git clone <your-remote>/autotuner.git autotuner
```

(The autotuner folder is `Projects/AI-Studio-Apps/autotuner` locally; on PA it should sit at `~/autotuner`.)

## 2 · Install dependencies

```bash
pip3.11 install --user -r ~/PayprProto/requirements.txt -r ~/autotuner/requirements.txt
```

## 3 · Seed the Autotuner product (idempotent)

```bash
cd ~/PayprProto && python3.11 seed_autotuner.py
```

Note the printed `PAYPR_ARTICLE_ID=<n>` — you need it in step 4. If this is a brand-new database and you also want the full demo newsstand, run `python3.11 seed.py` **first** (it drops and recreates everything), then `seed_autotuner.py`.

## 4 · The Web tab

Create (or reuse) a web app → **Manual configuration** → Python 3.11. Open its WSGI configuration file and replace the contents with:

```python
import sys, os

os.environ["SECRET_KEY"] = "<long random string A>"
os.environ["JWT_SECRET_KEY"] = "<long random string B>"   # shared: Paypr signs, Autotuner verifies
os.environ["GEMINI_API_KEY"] = "<your Gemini key>"
os.environ["PAYPR_ARTICLE_ID"] = "<n from step 3>"
os.environ["PAYPR_DIR"] = "/home/YOURUSER/PayprProto"
os.environ["TUNER_DIR"] = "/home/YOURUSER/autotuner"
# optional: os.environ["DATABASE_URL"] = "sqlite:////home/YOURUSER/PayprProto/paypr.db"

sys.path.insert(0, "/home/YOURUSER/PayprProto")
from wsgi_combined import application
```

Generate the two secrets with `python3.11 -c "import secrets; print(secrets.token_hex(32))"`. Reload the web app.

## 5 · Smoke test (Bash console or browser)

```bash
D=https://YOURUSER.pythonanywhere.com
curl -s -o /dev/null -w "%{http_code}\n" $D/            # 200 · Paypr newsstand
curl -s -o /dev/null -w "%{http_code}\n" $D/tuner/      # 200 · Autotuner
curl -s $D/tuner/api/paypr-config                        # {"enabled": true, ...}
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Content-Type: application/json" \
  -d '{"messages":[]}' $D/tuner/api/export-commentary    # 402 · the gate is up
```

Then in the browser: open `/tuner/`, tune a voice, hit **Export** (menu shows the 25¢ tag). It will prompt for an email, sign you in, top the wallet up from the demo faucet, pay, unlock, and download — narrated step by step in the chat.

## How it works (30 seconds)

- `wsgi_combined.py` routes `/tuner/*` to the Autotuner (SCRIPT_NAME-mounted) and everything else to Paypr. Same origin ⇒ Paypr's session cookie and CSRF-exempt JSON endpoints (`/api/auth/login`, `/api/pay`, `/api/account/topup`) work directly from the Autotuner's JS.
- A purchase of the seeded article returns a 10-minute HS256 JWT. The Autotuner verifies it **locally** with the shared `JWT_SECRET_KEY` (claim check: `article_id`) — no server-to-server call, so a single-worker web app can never deadlock on itself.
- No `PAYPR_ARTICLE_ID`/secret in the environment ⇒ the gate is off and Export is free. The autotuner runs standalone unchanged.

## Production notes

- **The dev faucet is real free credit.** `/api/account/topup` accepts preset amounts with no payment. Fine for the demo; before any public "real" use, disable it or gate it behind admin, and switch top-ups to the existing Stripe checkout routes (`STRIPE_API_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` in the WSGI env).
- Token revocation (`RevokedToken`) is checked by Paypr, not by the Autotuner's local verify; tokens live 10 minutes, which bounds the exposure. Acceptable for this product; if it ever matters, verify via Paypr's `/paypr/unlock` from a worker with >1 web worker.
- `SESSION_COOKIE_SECURE` is False in Paypr's BaseConfig; set `FLASK_ENV`/config for production HTTPS if you harden later.
