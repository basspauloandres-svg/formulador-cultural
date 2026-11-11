"""Comprueba el registro real de rutas de FastAPI antes de desplegar."""
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))
from fastapi.testclient import TestClient
from main import app


def test_research_route_is_registered():
    routes = [(getattr(route, "path", ""), getattr(route, "methods", set())) for route in app.routes]
    assert any(path == "/assistant/s02/research" and "POST" in methods for path, methods in routes)


def test_assistant_status_exposes_no_secrets_and_reports_route():
    response = TestClient(app).get("/assistant/status")
    assert response.status_code == 200
    data = response.json()
    assert data["research_route_available"] is True
    assert data["research_build"] == "s02-research-route-check-20261111"
    assert "GROQ_API_KEY" not in str(data)


def test_research_requires_auth_not_404():
    response = TestClient(app).post("/assistant/s02/research", json={
        "section": "S02", "field": "caracteristicas_culturales",
        "text": "Prueba sintética del territorio de Neira.", "context": "Neira",
        "include_web": False,
    })
    assert response.status_code == 401
