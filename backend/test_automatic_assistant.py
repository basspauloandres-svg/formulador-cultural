"""Pruebas sintéticas del flujo automático: sin red, usuarios reales ni IA externa."""
import asyncio
import os
import sys
from unittest.mock import AsyncMock, patch
import pytest

from fastapi import HTTPException
from reportlab.pdfgen import canvas
from io import BytesIO
sys.path.insert(0, os.path.dirname(__file__))
import automatic_assistant as guided

@pytest.fixture(autouse=True)
def isolated_national_divipola():
    async def fake_resolve(context):
        value=context.casefold()
        if "villamar" in value:
            label,code="Villamaría","17873"
        elif "neira" in value:
            label,code="Neira","17486"
        elif "anserma" in value:
            label,code="Anserma","17042"
        else:
            return {"status":"NOT_FOUND","identity":None}
        return {"status":"FOUND","identity":{
            "municipality":label,"department":"Caldas","divipola":code,
            "territory_type":"Municipio",
            "url":"https://www.datos.gov.co/Mapas-Nacionales/DIVIPOLA-C-digos-municipios/gdxc-w37w",
            "status":"ADMINISTRATIVE_REGISTRY_MATCH",
        }}
    with patch.object(guided,"resolve_territory",new=fake_resolve):
        yield



def request(context="Municipio de Neira Caldas", field="caracteristicas_culturales"):
    return guided.GuidedRequest(field=field, section="S02", context=context,
        text="El municipio presenta manifestaciones culturales que requieren documentación.")


def synthetic_pdf():
    buf=BytesIO()
    out=canvas.Canvas(buf)
    out.drawString(45,740,"La banda estudiantil realiza actividades musicales documentadas.")
    out.showPage()
    out.save()
    return buf.getvalue()


def research_result():
    return {"sources": [{"title":"Candidato", "url":"https://www.datos.gov.co/d/abcd-1234"}], "errors": []}


def test_neira_requires_department_for_curated_source():
    assert guided.municipality_key("Municipio de Neira Caldas") == ("neira","caldas")
    assert guided.municipality_key("Neira") == ("neira","caldas")
    assert guided.municipality_key("Fuera de Neira") is None


def test_extracts_page_as_excerpt_without_certifying_claim():
    extracts=guided.passages_from_pdf(synthetic_pdf(),"caracteristicas_culturales")
    assert len(extracts)==1
    assert extracts[0]["page"]==1
    assert "banda" in extracts[0]["excerpt"].lower()


def test_other_municipalities_receive_guidance_without_fabricated_facts():
    with patch.object(guided, "research", new=AsyncMock(return_value=research_result())), \
         patch.object(guided, "fetch_document", new=AsyncMock()) as fetch, \
         patch.object(guided, "assist", new=AsyncMock(return_value={"suggestion":"", "review_flags":[], "blocked_for_evidence":False})) as model:
        result=asyncio.run(guided.guide(request(context="Anserma Caldas"), "Bearer synthetic"))
    fetch.assert_not_called()
    model.assert_awaited_once()
    assert model.await_args.kwargs["evidence"] is None
    assert result["sources"] == []
    assert result["candidate_sources"]
    assert result["suggestion"] is None
    assert result["claim_status"] == "INSUFFICIENT_EVIDENCE"
    assert result["guidance"]


def test_inaccessible_document_gracefully_falls_back_to_guidance():
    with patch.object(guided, "research", new=AsyncMock(return_value=research_result())), \
         patch.object(guided, "fetch_document", new=AsyncMock(return_value=None)), \
         patch.object(guided, "assist", new=AsyncMock(return_value={"suggestion":"", "review_flags":[], "blocked_for_evidence":False})) as model:
        result=asyncio.run(guided.guide(request(), "Bearer synthetic"))
    model.assert_awaited_once()
    assert result["sources"] == []
    assert result["guidance"]


def test_pdf_passage_used_as_server_provided_context_not_user_supplied_citation():
    doc={**guided.INSTITUTIONAL_DOCUMENTS[("neira","caldas")][0],
         "document_sha256":"a"*64,"status":"PASSAGES_EXTRACTED_CLAIMS_UNVERIFIED",
         "passages":[{"page":1,"excerpt":"La banda estudiantil realiza actividades musicales documentadas."}]}
    assistant_result={"suggestion":"Texto para revisar [F1, p.1].",
                      "blocked_for_evidence":False,"review_flags":[]}
    with patch.object(guided, "research", new=AsyncMock(return_value=research_result())), \
         patch.object(guided, "fetch_document", new=AsyncMock(return_value=doc)), \
         patch.object(guided, "assist", new=AsyncMock(return_value=assistant_result)) as model:
        result=asyncio.run(guided.guide(request(), "Bearer synthetic"))
    assert model.await_count==1
    evidence=model.await_args.kwargs["evidence"]
    assert "[F1, p.1]" in evidence
    assert "banda estudiantil" in evidence
    assert result["suggestion"]=="Texto para revisar [F1, p.1]."
    assert result["claim_status"]=="INSUFFICIENT_EVIDENCE"
    assert result["requires_approval"]


def test_generated_causality_remains_blocked():
    doc={**guided.INSTITUTIONAL_DOCUMENTS[("neira","caldas")][0],
         "passages":[{"page":1,"excerpt":"Actividades culturales institucionales."}]}
    with patch.object(guided, "research", new=AsyncMock(return_value=research_result())), \
         patch.object(guided, "fetch_document", new=AsyncMock(return_value=doc)), \
         patch.object(guided, "assist", new=AsyncMock(return_value={
             "suggestion":"","blocked_for_evidence":True,"review_flags":[{"type":"UNSUPPORTED_CAUSAL_CLAIM"}]})):
        result=asyncio.run(guided.guide(request(),"Bearer synthetic"))
    assert result["blocked_for_evidence"]
    assert result["suggestion"] is None


def test_invalid_citation_page_is_not_offered_as_approvable_draft():
    doc={**guided.INSTITUTIONAL_DOCUMENTS[("neira","caldas")][0],
         "passages":[{"page":1,"excerpt":"Banda estudiantil con actividades musicales."}]}
    with patch.object(guided, "research", new=AsyncMock(return_value=research_result())), \
         patch.object(guided, "fetch_document", new=AsyncMock(return_value=doc)), \
         patch.object(guided, "assist", new=AsyncMock(return_value={
             "suggestion":"Texto sin respaldo [F1, p.99].", "blocked_for_evidence":False, "review_flags":[]})):
        result=asyncio.run(guided.guide(request(), "Bearer synthetic"))
    assert result["blocked_for_evidence"] is True
    assert result["suggestion"] is None


def test_provider_429_still_returns_guidance():
    doc={**guided.INSTITUTIONAL_DOCUMENTS[("neira","caldas")][0],
         "passages":[{"page":1,"excerpt":"La banda estudiantil participa en actividades musicales."}]}
    with patch.object(guided, "research", new=AsyncMock(return_value=research_result())), \
         patch.object(guided, "fetch_document", new=AsyncMock(return_value=doc)), \
         patch.object(guided, "assist", new=AsyncMock(side_effect=HTTPException(429,"rate limit"))):
        result=asyncio.run(guided.guide(request(), "Bearer synthetic"))
    assert result["guidance"]
    assert result["suggestion"] is None
    assert result["sources"]


def test_no_source_still_generates_editable_draft_without_fake_evidence():
    generated = {"suggestion": "Borrador basado en observación del formador.",
                 "blocked_for_evidence": False, "review_flags": []}
    with patch.object(guided, "research", new=AsyncMock(return_value=research_result())), \
         patch.object(guided, "fetch_document", new=AsyncMock(return_value=None)), \
         patch.object(guided, "assist", new=AsyncMock(return_value=generated)) as model:
        result=asyncio.run(guided.guide(request(), "Bearer synthetic"))
    assert result["suggestion"] == generated["suggestion"]
    assert result["sources"] == []
    assert model.await_args.kwargs["evidence"] is None
    assert result["claim_status"] == "INSUFFICIENT_EVIDENCE"


def test_irrelevant_pcc_is_not_used_as_local_music_evidence():
    buf = BytesIO()
    pdf = canvas.Canvas(buf)
    pdf.drawString(40, 740, "El Paisaje Cultural Cafetero constituye un ejemplo de adaptación")
    pdf.drawString(40, 725, "humana a condiciones geográficas difíciles sobre las que")
    pdf.drawString(40, 710, "se desarrolló una caficultura de ladera y montaña.")
    pdf.showPage()
    pdf.save()
    assert guided.passages_from_pdf(buf.getvalue(), "caracteristicas_culturales") == []


def test_villamaria_identity_is_distinct_from_neira():
    assert guided.municipality_key("Villamaría, Caldas") == ("villamaria", "caldas")
    assert guided.municipality_key("Villamaria") == ("villamaria", "caldas")
    assert guided.municipality_key("Municipio de Villamaría Caldas") == ("villamaria", "caldas")
    assert guided.municipality_key("Municipio de Neira Caldas") == ("neira", "caldas")
    assert guided.municipality_key("Neira, Villamaría, Caldas") is None
    assert guided.TERRITORIAL_IDENTITIES[("villamaria", "caldas")]["divipola"] == "17873"


def test_villamaria_blank_field_gets_guidance_without_groq_or_neira_pdf():
    req=guided.GuidedRequest(field="territorio_o_lugar_de_intervencion",
                            context="Villamaría, Caldas", text="", generate=False)
    with patch.object(guided, "research", new=AsyncMock(return_value=research_result())) as search, \
         patch.object(guided, "fetch_document", new=AsyncMock()) as fetch, \
         patch.object(guided, "assist", new=AsyncMock()) as model:
        result=asyncio.run(guided.guide(req, "Bearer synthetic"))
    assert result["territory"]["divipola"] == "17873"
    assert result["territory"]["municipality"] == "Villamaría"
    assert result["territory_context"] == "Villamaría, Caldas"
    assert result["sources"] == []
    assert result["guidance"]
    assert result["suggestion"] is None
    assert result["claim_status"] == "INSUFFICIENT_EVIDENCE"
    assert "Villamaría" in search.await_args.args[0].text
    fetch.assert_not_called()
    model.assert_not_called()


def test_neira_pdf_is_not_reused_for_villamaria_cultural_field():
    req=guided.GuidedRequest(field="caracteristicas_culturales",
                            context="Villamaria, Caldas", text="Musicas tradicionales de la comunidad.",
                            generate=False)
    with patch.object(guided, "research", new=AsyncMock(return_value=research_result())), \
         patch.object(guided, "fetch_document", new=AsyncMock()) as fetch:
        result=asyncio.run(guided.guide(req, "Bearer synthetic"))
    assert result["sources"] == []
    assert result["territory"]["divipola"] == "17873"
    fetch.assert_not_called()


def test_territory_switch_flags_old_neira_text_without_erasing_it():
    req=guided.GuidedRequest(field="caracteristicas_culturales",
                            context="Villamaría, Caldas",
                            text="Las características culturales de Neira y su música son objeto de investigación.",
                            generate=False)
    with patch.object(guided, "research", new=AsyncMock(return_value=research_result())), \
         patch.object(guided, "fetch_document", new=AsyncMock()) as fetch:
        result=asyncio.run(guided.guide(req, "Bearer synthetic"))
    assert result["territory"]["municipality"] == "Villamaría"
    assert result["review_flags"][0]["type"] == "TERRITORY_MISMATCH"
    assert "Neira" in result["review_flags"][0]["instruction"]
    assert result["suggestion"] is None
    fetch.assert_not_called()
