"""Structured route: isolated authentication and provider, no external calls."""
import asyncio
from unittest.mock import AsyncMock, patch
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
import structured_s02 as s
from staging_preview import app
from test_territory_registry import fixture_rows
from territory_registry import parse_dataset
from source_research import ResearchRequest, search_terms

def source(id="M1",code="17873",scope="municipal",url="https://example.org/a",fragment="La banda estudiantil de Villamaría realiza actividades musicales documentadas."):
    return s.Fuente(id=id,titulo="Fuente sintética",url=url,fragmento=fragment,periodo="2025",
        alcance=scope,codigo_territorio=code,sha256="a"*64,localizador="Párrafo 1",kind="municipal_html")

def test_catalog_all_rows_and_exact_lookup():
    rows=parse_dataset(fixture_rows())
    with patch.object(s,"registry",new=AsyncMock(return_value=rows)):
        result=asyncio.run(s.catalogo())
    assert result["count"]==len(rows)==1122
    assert result["territorios"][0]["codigo"]=="05000"
    assert len(result["snapshot_sha256"])==64
    assert len({r["codigo"] for r in result["territorios"]})==len(rows)

def test_scope_filter_and_claim_controls():
    a=source(); b=source("M2",url="https://example.org/b",fragment="La banda estudiantil de Villamaría registra actividades musicales en 2025.")
    sources=s.scoped_sources([a,b,source("X","50313"),source("D","17","departamental"),source("N",None,"nacional")],"17873")
    assert set(sources)=={"M1","M2","D","N"}
    output=s.SalidaModelo(afirmaciones=[
        s.Afirmacion(texto="La banda estudiantil de Villamaría realiza actividades musicales documentadas.",fuente_ids=["M1"],estado="respaldo_propuesto"),
        s.Afirmacion(texto="Migración juvenil y envejecimiento demográfico.",fuente_ids=["M1"],estado="respaldo_propuesto"),
        s.Afirmacion(texto="Hay 800 jóvenes.",fuente_ids=["M1"],estado="respaldo_propuesto"),
        s.Afirmacion(texto="La banda estudiantil de Villamaría registra actividades musicales.",fuente_ids=["M1","M2"],estado="contradictoria"),
        s.Afirmacion(texto="Sin fuente",fuente_ids=["X"],estado="respaldo_propuesto")])
    claims,audit,lines,used=s.review_claims(output,sources,"17873")
    assert claims[0]["estado"]=="respaldo_propuesto"
    assert audit[0]["status"]=="MODEL_SUPPORT_PROPOSED"
    assert any(c["estado"]=="contradictoria" for c in claims)
    assert any(c["estado"]=="insuficiente" for c in claims)
    assert not any("800" in line or "Migración juvenil" in line for line in lines)
    assert any("[POR VERIFICAR]" in line for line in lines)
    assert {r["citation"] for r in used}=={"M1","M2"}

@pytest.mark.parametrize("code,city,dept",[
    ("17873","Villamaría","Caldas"),("27001","Quibdó","Chocó"),("11001","Bogotá, D.C.","Bogotá, D.C."),
    ("05313","Granada","Antioquia"),("50313","Granada","Meta"),("91001","Leticia","Amazonas")])
def test_exact_code_route_and_no_evidence(code,city,dept):
    identity={"divipola":code,"municipality":city,"department":dept}
    with patch.object(s,"verified_user",new=AsyncMock(return_value="synthetic")), \
         patch.object(s,"resolve_territory",new=AsyncMock(return_value={"status":"FOUND","identity":identity})) as resolve, \
         patch.object(s,"guide",new=AsyncMock(return_value={"territory":identity})) as retrieve, \
         patch.object(s,"generate_json",new=AsyncMock()) as model:
        r=TestClient(app).post("/assistant/s02/contexto-territorial",headers={"Authorization":"Bearer synthetic"},
            json={"codigo_divipola":code,"consulta":"No conozco las dinámicas sociales, investiga","field":"principales_dinamicas_sociales"})
        assert r.status_code==200
        assert r.json()["codigo_divipola"]==code and r.json()["suggestion"] is None
        assert r.json()["metrics"]["model_calls"]==0
        resolve.assert_awaited_once_with(code)
        assert retrieve.await_args.args[0].codigo_divipola==code
        model.assert_not_called()

def test_provider_failure_and_no_anonymous_access():
    client=TestClient(app)
    body={"codigo_divipola":"17873","consulta":"bandas","field":"caracteristicas_culturales"}
    assert client.post("/assistant/s02/contexto-territorial",json=body).status_code==401
    identity={"divipola":"17873","municipality":"Villamaría","department":"Caldas"}
    with patch.object(s,"verified_user",new=AsyncMock(return_value="synthetic")), \
         patch.object(s,"resolve_territory",new=AsyncMock(return_value={"status":"FOUND","identity":identity})), \
         patch.object(s,"guide",new=AsyncMock(return_value={"territory":identity})), \
         patch.object(s,"collect_sources",return_value={"M1":source()}), \
         patch.object(s,"generate_json",new=AsyncMock(side_effect=RuntimeError("private provider detail"))):
        r=client.post("/assistant/s02/contexto-territorial",json=body,headers={"Authorization":"Bearer synthetic"})
    assert r.status_code==503
    assert "private provider detail" not in r.text

def test_query_terms_are_specific_and_no_private_free_text():
    req=ResearchRequest(field="principales_dinamicas_sociales",context="Neira, Caldas",text="Consulta pública",question="Migración y empleo juvenil en 2025, mi correo privado")
    q=search_terms(req)
    assert "migracion" in q and "empleo" in q and "2025" in q
    assert "correo" not in q

def test_valid_draft_exact_provenance_and_metrics():
    identity={"divipola":"17873","municipality":"Villamaría","department":"Caldas"}
    output=s.SalidaModelo(afirmaciones=[s.Afirmacion(texto=source().fragmento,fuente_ids=["M1"],estado="respaldo_propuesto")])
    with patch.object(s,"verified_user",new=AsyncMock(return_value="synthetic")), \
         patch.object(s,"resolve_territory",new=AsyncMock(return_value={"status":"FOUND","identity":identity})), \
         patch.object(s,"guide",new=AsyncMock(return_value={"territory":identity})), \
         patch.object(s,"collect_sources",return_value={"M1":source()}), \
         patch.object(s,"generate_json",new=AsyncMock(return_value=(output,{"prompt_tokens":None,"completion_tokens":None}))) as model:
        r=TestClient(app).post("/assistant/s02/contexto-territorial",headers={"Authorization":"Bearer synthetic"},
            json={"codigo_divipola":"17873","consulta":"bandas","field":"caracteristicas_culturales","aporte":"No conozco las dinámicas sociales, investiga."})
    assert r.status_code==200
    data=r.json()
    assert "[M1]" in data["suggestion"]
    assert data["evidence_manifest"][0]["prompt_excerpt"]==source().fragmento
    assert data["used_references"]==data["evidence_manifest"]
    assert data["claim_status"]=="INSUFFICIENT_EVIDENCE"
    assert data["metrics"]["prompt_tokens"] is None
    assert '"aporte_no_verificado": ""' in model.await_args.args[1]
