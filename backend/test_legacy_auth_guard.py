"""Regression: caller-controlled X-User-Id must never authorize project access."""
from uuid import uuid4
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_legacy_project_routes_reject_spoofed_identity():
    uid = str(uuid4())
    project = str(uuid4())
    requests = [
        ("post", "/projects", {"json": {"title": "Proyecto QA"}}),
        ("get", "/projects", {}),
        ("get", f"/projects/{project}", {}),
        ("put", f"/projects/{project}/sections/S01", {"json": {"data": {"nombre": "QA"}}}),
    ]
    for method, path, kwargs in requests:
        response = getattr(client, method)(path, headers={"X-User-Id": uid}, **kwargs)
        assert response.status_code == 410, (method, path, response.text)


def test_document_routes_are_not_blocked_by_legacy_auth_guard():
    routes = {(r.path, tuple(sorted(r.methods or []))): r for r in app.routes}
    assert any(path == "/documents/pdf" for path, _ in routes)
    assert any(path == "/documents/docx" for path, _ in routes)
