"""Combined WSGI: Paypr at the root, the Autotuner mounted at /tuner.

One PythonAnywhere web app serves both. Paypr keeps every one of its absolute
paths (/api, /account, /showcase, /static, …) untouched at the root; the
autotuner lives under /tuner and calls the Paypr API same-origin, so session
cookies and the pay flow just work — no CORS, no cross-domain anything.

On PythonAnywhere, the Web tab's WSGI file should:

    import sys, os
    os.environ.setdefault("JWT_SECRET_KEY", "<one long random string>")
    os.environ.setdefault("SECRET_KEY", "<another long random string>")
    os.environ.setdefault("GEMINI_API_KEY", "<your Gemini key>")
    os.environ.setdefault("PAYPR_ARTICLE_ID", "<id printed by seed_autotuner.py>")
    os.environ.setdefault("PAYPR_DIR", "/home/YOURUSER/PayprProto")
    os.environ.setdefault("TUNER_DIR", "/home/YOURUSER/autotuner")
    sys.path.insert(0, "/home/YOURUSER/PayprProto")
    from wsgi_combined import application

Local dev:  python wsgi_combined.py   (serves http://127.0.0.1:8600)
"""
import os
import sys
import importlib.util

PAYPR_DIR = os.environ.get("PAYPR_DIR", os.path.dirname(os.path.abspath(__file__)))
TUNER_DIR = os.environ.get("TUNER_DIR", os.path.join(os.path.dirname(PAYPR_DIR), "AI-Studio-Apps", "autotuner"))

if PAYPR_DIR not in sys.path:
    sys.path.insert(0, PAYPR_DIR)

# ---- Paypr (root app) -------------------------------------------------------
from app import create_app as _paypr_create  # PayprProto/app.py — first on sys.path

paypr_app = _paypr_create()


# ---- Autotuner (mounted at /tuner) ------------------------------------------
# Loaded under its own module name so its `app.py` never collides with Paypr's.
def _load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod

tuner_app = _load_module("autotuner_app", os.path.join(TUNER_DIR, "app.py")).app

MOUNT = "/tuner"


def application(environ, start_response):
    path = environ.get("PATH_INFO", "") or ""
    if path == MOUNT or path.startswith(MOUNT + "/"):
        environ["SCRIPT_NAME"] = (environ.get("SCRIPT_NAME", "") or "") + MOUNT
        environ["PATH_INFO"] = path[len(MOUNT):] or "/"
        return tuner_app(environ, start_response)
    return paypr_app(environ, start_response)


if __name__ == "__main__":
    from werkzeug.serving import run_simple
    run_simple("127.0.0.1", 8600, application, use_reloader=False, use_debugger=False)
