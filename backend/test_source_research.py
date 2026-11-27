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


def test_open_topic_works_at_municipal_and_national_scopes():
    local = request("Tumaco, Nariño").model_copy(update={"public_topic": "movilidad fluvial"})
    national = local.model_copy(update={"context": ""})
    assert research.search_terms(local) == "Tumaco Nariño movilidad fluvial"
    assert research.search_terms(national) == "Colombia movilidad fluvial"
    candidates = [
        {"title": "Movilidad fluvial de Tumaco", "evidence_status": "INSUFFICIENT_EVIDENCE"},
        {"title": "Prácticas culturales en Tumaco", "evidence_status": "INSUFFICIENT_EVIDENCE"},
        {"title": "Movilidad fluvial en Guapi", "evidence_status": "INSUFFICIENT_EVIDENCE"},
    ]
    found, _ = research.filter_relevant(candidates, local.field, local.context, local.public_topic)
    assert found == [{**candidates[0], "relevance_status": "MUNICIPAL_THEMATIC_CANDIDATE",
                      "territorial_scope_status": "MUNICIPALITY_MENTIONED_IN_METADATA"}]
    national_found, _ = research.filter_relevant(candidates, national.field, national.context, national.public_topic)
    assert [item["title"] for item in national_found] == [candidates[0]["title"], candidates[2]["title"]]


def test_open_topic_rejects_contact_or_url_syntax():
    with pytest.raises(HTTPException) as err:
        research.search_terms(request().model_copy(update={"public_topic": "persona@example.org"}))
    assert err.value.status_code == 422


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
        if "wikipedia.org" in url:
            return httpx.Response(200, json={"query": {"search": []}}, request=httpx.Request("GET", url))
        return httpx.Response(200, json={"results": []}, request=httpx.Request("GET", url))


def test_request_requires_session_and_keeps_empty_sources_unverified():
    calls = []
    with patch.dict(os.environ, {"BRAVE_SEARCH_API_KEY": ""}), \
         patch.object(research, "verified_user", new=AsyncMock(return_value="synthetic")), \
         patch.object(research, "reserve_research", return_value=True), \
         patch.object(research.httpx, "AsyncClient", side_effect=lambda **kwargs: Client(calls)):
        result = asyncio.run(research.research(request(), "Bearer synthetic"))
    assert len(calls) == 3
    assert result["sources"] == []
    assert result["verified_claims"] == []
    assert result["evidence_status"] == "INSUFFICIENT_EVIDENCE"
    assert result["web_enabled"]
    assert not result["web_extended_enabled"]

def test_wikipedia_sources_are_secondary_not_verified():
    data = {"query": {"search": [{"pageid": 1234, "title": "Neira"}]}}
    item = research.normalize_wikipedia(data)[0]
    assert item["type"] == "fuente_secundaria"
    assert item["evidence_status"] == "INSUFFICIENT_EVIDENCE"
    assert item["url"] == "https://es.wikipedia.org/?curid=1234"

def test_research_quota_is_independent_from_groq_quota():
    import assistant_pilot as pilot
    research._research_times.clear()
    pilot._times.clear()
    assert all(pilot.reserve("same-user", now=100) for _ in range(8))
    assert not pilot.reserve("same-user", now=101)
    assert research.reserve_research("same-user", now=101)
    assert all(research.reserve_research("same-user", now=101) for _ in range(19))
    assert not research.reserve_research("same-user", now=101)
    assert research.reserve_research("same-user", now=3701)
    research._research_times.clear()
    pilot._times.clear()


def test_invalid_location_does_not_spend_research_quota():
    research._research_times.clear()
    with pytest.raises(HTTPException) as exc:
        asyncio.run(research.research(request(context=""), "Bearer synthetic-token"))
    assert exc.value.status_code == 422
    assert research._research_times == {}

def test_fallback_catalog_query_broadens_without_user_text():
    calls = []
    with patch.dict(os.environ, {"BRAVE_SEARCH_API_KEY": ""}), \
         patch.object(research, "verified_user", new=AsyncMock(return_value="synthetic")), \
         patch.object(research, "reserve_research", return_value=True), \
         patch.object(research.httpx, "AsyncClient", side_effect=lambda **kwargs: Client(calls)):
        asyncio.run(research.research(request(), "Bearer synthetic"))
    assert calls[0][1]["q"] == "Neira cultura música"
    assert calls[1][1]["q"] == "Neira cultura"
    assert not any("agrupaciones" in str(params) for _, params in calls)


def test_cultural_field_filters_irrelevant_territorial_matches():
    items = [
        {"title": "Censo Estudiantil IE de Neira", "summary": "", "evidence_status": "INSUFFICIENT_EVIDENCE"},
        {"title": "Índice de información clasificada", "summary": "", "evidence_status": "INSUFFICIENT_EVIDENCE"},
        {"title": "Caracterización de prácticas musicales de Neira", "summary": "", "evidence_status": "INSUFFICIENT_EVIDENCE"},
    ]
    chosen, excluded = research.filter_relevant(items, "caracteristicas_culturales")
    assert len(chosen) == 1
    assert chosen[0]["title"] == "Caracterización de prácticas musicales de Neira"
    assert chosen[0]["evidence_status"] == "INSUFFICIENT_EVIDENCE"
    assert chosen[0]["relevance_status"] == "THEMATIC_CANDIDATE"
    assert excluded == 2


def test_context_field_preserves_territorial_source_without_declaring_evidence():
    chosen, excluded = research.filter_relevant(
        [{"title": "Ordenamiento territorial", "summary": ""}],
        "territorio_o_lugar_de_intervencion")
    assert len(chosen) == 1
    assert excluded == 0


def test_villamaria_filters_results_from_cali_and_pereira():
    irrelevant = [
        {"title": "Listado de Artistas PEREIRA", "summary": "Proyectos musicales."},
        {"title": "Temporada Encuentro Música Clásica Cali", "summary": "Música."},
        {"title": "Espacios de las Artes, las Culturas y los Saberes", "summary": "Colombia"},
        {"title": "Género y escolarización", "summary": "Informe de formación"},
        {"title": "Espacios de formación en tradición oral, sonora y música popular 2017 Cali", "summary": ""},
    ]
    relevant = {"title": "Caracterización cultural de Villamaría (Caldas)",
                "summary": "Bandas, prácticas musicales y patrimonio local"}
    items = irrelevant + [relevant]
    chosen, excluded = research.filter_relevant(items, "caracteristicas_culturales", "Villamaría, Caldas")
    assert len(chosen) == 1
    assert chosen[0]["title"] == relevant["title"]
    assert chosen[0]["territorial_scope_status"] == "MUNICIPALITY_MENTIONED_IN_METADATA"
    assert excluded == 5


def test_department_only_is_insufficient_for_municipal_data():
    items=[{"title":"Caldas música tradicional","summary":"Programas y proyectos culturales"}]
    chosen, excluded = research.filter_relevant(items, "caracteristicas_culturales", "Villamaría, Caldas")
    assert chosen == []
    assert excluded == 1


def test_context_normalizes_accents_and_municipality_prefix():
    assert research.municipality_from_context("Municipio de Villamaría, Caldas") == "villamaria"
    assert research.municipality_from_context("Neira, Caldas") == "neira"
