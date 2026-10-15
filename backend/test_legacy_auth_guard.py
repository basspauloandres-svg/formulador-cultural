"""Regression tests: unauthenticated legacy CRUD must not read or mutate projects."""
from pathlib import Path
import sys
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from main import app, repo

client = TestClient(app)


def test_legacy_project_routes_reject_forged_and_missing_identity():
    project = str(uuid4())
    requests = [
        ("post", "/projects", {"json": {"title": "Proyecto QA"}}),
        ("get", "/projects", {}),
        ("get", f"/projects/{project}", {}),
        ("put", f"/projects/{project}/sections/S01", {"json": {"data": {"nombre": "QA"}}}),
    ]
    before = dict(repo._items)
    for headers in ({}, {"X-User-Id": str(uuid4())}, {"X-User-Id": "invalid"}):
        for method, path, kwargs in requests:
            response = getattr(client, method)(path, headers=headers, **kwargs)
            assert response.status_code == 410, (method, path, response.text)
            assert "verified authentication required" in response.json()["detail"]
    assert repo._items == before, "Denied requests must not mutate project state"


def test_active_health_and_vester_routes_remain_available():
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"
    vester = client.post("/vester/calculate", json=[])
    assert vester.status_code == 200, vester.text
    assert "result" in vester.json()


def test_document_routes_have_no_legacy_identity_dependency():
    for path in ("/documents/pdf", "/documents/docx"):
        route = next(r for r in app.routes if r.path == path)
        assert route.methods == {"POST"}
        assert not any(
            getattr(d.call, "__name__", "") == "reject_unverified_memory_api"
            for d in route.dependant.dependencies
        )
