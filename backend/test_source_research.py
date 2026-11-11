"""Pruebas del descubrimiento documental S02 sin red real ni claves."""
import asyncio
import os
import sys
from unittest.mock import AsyncMock, patch
import httpx
import pytest
from fastapi import HTTPException
sys.path.insert(0, os.path.dirname(__file__))
import source_research as research


def request(context="Neira"):
    return research.ResearchRequest(section="S02", field="caracteristicas_culturales",
       text="En el municipio existen diversas agrupaciones y espacios culturales.",
       context=context)


def test_search_does_not_leak_user_text():
    terms = research.search_terms(request())
    assert "Neira" in terms
    assert "agrupaciones" not in terms


def test_missing_location_fails_closed():
    with pytest.raises(HTTPException) as err:
        research.search_terms(request(context=""))
    assert err.value.status_code == 422


def test_catalog_results_are_candidates_never_verified():
    item = {"results": [{"resource": {"id": "abcd-1234", "name": "Registro cultural",
            "description": "Información de ejemplo"}}]}
    result = research.normalize_catalog(item)
    assert len(result) == 1
    assert result[0]["url"] == "https://www.datos.gov.co/d/abcd-1234"
    assert result[0]["evidence_status"] == "INSUFFICIENT_EVIDENCE"


def test_brave_results_remain_unverified():
    data = {"web": {"results": [{"title": "Fuente", "url": "https://example.org/registro"}]}}
    assert research.normalize_brave(data)[0]["evidence_status"] == "INSUFFICIENT_EVIDENCE"


class Client:
    def __init__(self, calls):
        self.calls = calls
    async def __aenter__(self): return self
    async def __aexit__(self, *args): return False
    async def get(self, url, params, headers):
        self.calls.append((url, params))
        return httpx.Response(200, json={"results": []})


def test_request_requires_session_and_keeps_empty_sources_unverified():
    calls = []
    with patch.dict(os.environ, {"BRAVE_SEARCH_API_KEY": ""}), \
         patch.object(research, "verified_user", new=AsyncMock(return_value="synthetic")), \
         patch.object(research, "reserve", return_value=True), \
         patch.object(research.httpx, "AsyncClient", side_effect=lambda **kwargs: Client(calls)):
        result = asyncio.run(research.research(request(), "Bearer synthetic"))
    assert len(calls) == 1
    assert result["sources"] == []
    assert result["verified_claims"] == []
    assert result["evidence_status"] == "INSUFFICIENT_EVIDENCE"
    assert not result["web_enabled"]
