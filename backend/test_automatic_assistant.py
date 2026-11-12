"""Pruebas sintéticas del flujo automático: sin red, usuarios reales ni IA externa."""
import asyncio
import os
import sys
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from reportlab.pdfgen import canvas
from io import BytesIO
sys.path.insert(0, os.path.dirname(__file__))
import automatic_assistant as guided


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
         patch.object(guided, "assist", new=AsyncMock()) as model:
        result=asyncio.run(guided.guide(request(context="Anserma Caldas"), "Bearer synthetic"))
    fetch.assert_not_called()
    model.assert_not_called()
    assert result["sources"] == []
    assert result["candidate_sources"]
    assert result["suggestion"] is None
    assert result["claim_status"] == "INSUFFICIENT_EVIDENCE"
    assert result["guidance"]


def test_inaccessible_document_gracefully_falls_back_to_guidance():
    with patch.object(guided, "research", new=AsyncMock(return_value=research_result())), \
         patch.object(guided, "fetch_document", new=AsyncMock(return_value=None)), \
         patch.object(guided, "assist", new=AsyncMock()) as model:
        result=asyncio.run(guided.guide(request(), "Bearer synthetic"))
    model.assert_not_called()
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
