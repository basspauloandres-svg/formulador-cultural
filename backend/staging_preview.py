"""Isolated editorial review on the existing free VERTICE staging service.

Serve only the candidate's explicitly referenced frontend assets and non-persistent
public/deterministic endpoints and authenticated assistant routes. Browser drafts
remain local; the existing account is used only for identity verification.
This entrypoint is for staging only; main:app remains untouched.
"""
from pathlib import Path
import re
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, Response
from request_limits import ResourceLimits
from main import (
    document_docx, document_pdf, vester_calculate, territorial_identity,
    assistant_status, assistant_knowledge, assistant_section_review, assistant_s02,
    assistant_s02_research, assistant_s02_guide, assistant_s02_verify_excerpt,
)
from assistant_pilot import configured, SUPABASE_URL
from staging_transforms import auth_only_app, local_evidence, replace_once

ROOT = Path(__file__).resolve().parent.parent
SOURCE = (ROOT / "index.html").read_text(encoding="utf-8")
ASSETS = frozenset(
    re.findall(r'(?:src|href)="([A-Za-z0-9_-]+\.(?:js|css))(?:\?[^"]*)?"', SOURCE)
)
PRODUCTION_API = "https://formulador-cultural-api.onrender.com"
POLICY = (
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
    "style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; "
    f"connect-src 'self' {SUPABASE_URL}/auth/v1/; font-src 'self' data:; object-src 'none'; "
    "base-uri 'self'; form-action 'none'; frame-ancestors 'none'"
)
HEADERS = {
    "Content-Security-Policy": POLICY,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow",
}
app = FastAPI(title="VÉRTICE — ensayo editorial aislado", docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(ResourceLimits)

@app.get("/health")
def health():
    return {"status": "ok", "mode": "editorial-review-local", "candidate": "ea0e1577f6cea6ab4c76e9cd23103b7b34d22938", "cloud": False, "generative_ai": configured(), "auth": "existing-account-only"}

@app.get("/assistant/status")
def status():
    return assistant_status()

@app.get("/", response_class=HTMLResponse)
def index():
    html = SOURCE
    html = html.replace("</head>", """<style>#signupBtn,#loginBtn,#setPasswordBtn,#syncBtn,.auth-divider,#projectManager{display:none!important}</style>
<script>window.FC_DOCUMENT_API_URL=location.origin;window.FC_LOCAL_PROJECTS=true;</script><script src="h01-projects.js"></script></head>""", 1)
    html = html.replace('<body class="guided-mode workspace-preview">',
        '<body class="guided-mode workspace-preview"><div role="status" style="padding:12px 16px;background:#183d35;color:white;text-align:center;font:600 15px system-ui">VÉRTICE · Entorno de prueba · Datos de ejemplo · Guardado local independiente · Acceso a IA con cuenta existente</div>', 1)
    return HTMLResponse(html, headers=HEADERS)

app.add_api_route("/documents/docx", document_docx, methods=["POST"])
app.add_api_route("/documents/pdf", document_pdf, methods=["POST"])
app.add_api_route("/vester/calculate", vester_calculate, methods=["POST"])
app.add_api_route("/territory/resolve", territorial_identity, methods=["POST"])
app.add_api_route("/assistant/knowledge", assistant_knowledge, methods=["POST"])
app.add_api_route("/assistant/section/review", assistant_section_review, methods=["POST"])
app.add_api_route("/assistant/s02", assistant_s02, methods=["POST"])
app.add_api_route("/assistant/s02/research", assistant_s02_research, methods=["POST"])
app.add_api_route("/assistant/s02/guide", assistant_s02_guide, methods=["POST"])
app.add_api_route("/assistant/s02/verify-excerpt", assistant_s02_verify_excerpt, methods=["POST"])

@app.get("/{asset}")
def asset(asset: str):
    if asset not in ASSETS and asset != "h01-projects.js":
        raise HTTPException(404, "Recurso no disponible en esta prueba")
    target = ROOT / asset
    if not target.is_file():
        raise HTTPException(404, "Recurso ausente")
    content = target.read_text(encoding="utf-8").replace(PRODUCTION_API, "")
    if asset == "app.js":
        content = auth_only_app(content)
    elif asset == "evidence.js":
        content = local_evidence(content)
    elif asset == "deliverables.js":
        # Ignore stored/query-string API destinations in the isolated review.
        content = content.replace("function documentApiBase(){", "function documentApiBase(){return location.origin;")
    return Response(content, media_type="text/javascript" if asset.endswith(".js") else "text/css", headers=HEADERS)
