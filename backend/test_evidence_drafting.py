"""Evidencia -> propuesta editable con aprobación humana en el formulario."""
import asyncio
import os
import sys
from unittest.mock import AsyncMock, patch

sys.path.insert(0, os.path.dirname(__file__))
import evidence_drafting as drafting


def baseline_claim():
    return {"statement":"Villamaría tiene bandas musicales.",
            "classification":"USER_ASSERTION_UNVERIFIED",
            "evidence_status":"INSUFFICIENT_EVIDENCE"}


def test_preindexed_sources_do_not_enter_prompt():
    references=[{"passage_status":"INDEXED_INSTITUTIONAL_REFERENCE_UNVERIFIED",
                 "excerpt":"Cohesión social", "sha256":None,
                 "title":"Referencia histórica","url":"https://example.org/a",
                 "locator":"Resumen"}]
    evidence, selected=drafting.live_context(references)
    assert evidence is None
    assert selected == []


def test_only_live_extracted_passage_with_hash_is_eligible():
    entries=[{"passage_status":"EXCERPT_FOUND_CLAIM_UNVERIFIED",
              "excerpt":"En 2020 se realizaron talleres musicales.",
              "sha256":"a"*64, "title":"Informe municipal",
              "publisher":"Alcaldía","locator":"Párrafo HTML 8",
              "url":"https://villamaria-caldas.gov.co/MiMunicipio/Paginas/Mi-Municipio.aspx"}]
    evidence, selected=drafting.live_context(entries)
    assert "[E1]" in evidence
    assert "2020" in evidence
    assert len(selected)==1


def test_model_unavailable_returns_no_fake_redaction():
    with patch.object(drafting,"configured",return_value=False):
        result=asyncio.run(drafting.compose_section_draft(
            section="S02",field="caracteristicas_culturales",
            text="Villamaría tiene bandas musicales.",
            territory="Villamaría, Caldas",claims=[baseline_claim()],
            passages=[],user_id="u"))
    assert result["suggestion"] is None
    assert result["draft_status"]=="MODEL_NOT_CONFIGURED"


class MockResponse:
    status_code=200
    def __init__(self,text):self.text=text
    def json(self):
        return {"choices":[{"message":{"content":self.text}}]}

class MockClient:
    def __init__(self,result):self.result=result
    async def __aenter__(self):return self
    async def __aexit__(self,*args):return False
    async def post(self,*args,**kwargs):return self.result


def test_generated_cohesion_is_not_passed_as_fact():
    raw=("Villamaría tiene bandas musicales. "
         "Estas bandas fortalecen la cohesión social y la identidad regional.")
    with patch.object(drafting,"configured",return_value=True), \
         patch.object(drafting,"reserve",return_value=True), \
         patch.object(drafting,"groq_key",return_value="synthetic"), \
         patch.object(drafting.httpx,"AsyncClient",return_value=MockClient(MockResponse(raw))):
        result=asyncio.run(drafting.compose_section_draft(
            section="S02",field="caracteristicas_culturales",
            text="Villamaría tiene bandas musicales.",
            territory="Villamaría, Caldas",claims=[baseline_claim()],
            passages=[],user_id="synthetic"))
    assert result["draft_status"]=="EDITABLE_UNVERIFIED"
    assert result["suggestion"].startswith("Según la información preliminar aportada por el formador,")
    assert "Villamaría tiene bandas musicales." in result["suggestion"]
    assert "[POR VERIFICAR]" in result["suggestion"]
    assert "cohesión social" not in result["suggestion"]
    assert result["review_flags"]


def test_invented_citation_prevents_incorporation():
    with patch.object(drafting,"configured",return_value=True), \
         patch.object(drafting,"reserve",return_value=True), \
         patch.object(drafting,"groq_key",return_value="synthetic"), \
         patch.object(drafting.httpx,"AsyncClient",
                      return_value=MockClient(MockResponse("Villamaría tiene bandas musicales [E3]."))):
        result=asyncio.run(drafting.compose_section_draft(
            section="S02",field="caracteristicas_culturales",
            text="Villamaría tiene bandas musicales.",
            territory="Villamaría, Caldas",claims=[baseline_claim()],
            passages=[],user_id="synthetic"))
    assert result["suggestion"] is None
    assert result["draft_status"]=="INVALID_CITATION"


def test_s02_unverified_input_is_always_explicitly_attributed_to_author():
    with patch.object(drafting,"configured",return_value=True), \
         patch.object(drafting,"reserve",return_value=True), \
         patch.object(drafting,"groq_key",return_value="synthetic"), \
         patch.object(drafting.httpx,"AsyncClient",return_value=MockClient(MockResponse(
             "Villamaría se destaca por su gastronomía local y sus bandas."))):
        result=asyncio.run(drafting.compose_section_draft(
            section="S02",field="caracteristicas_culturales",
            text="Villamaría se destaca por su gastronomía local y sus bandas.",
            territory="Villamaría, Caldas",claims=[baseline_claim()],
            passages=[],user_id="synthetic"))
    assert result["suggestion"].startswith("Según la información preliminar aportada por el formador,")
    assert "[POR VERIFICAR]" in result["suggestion"]
    assert any(flag["type"]=="USER_ASSERTIONS_UNVERIFIED" for flag in result["review_flags"])


def test_context_budget_excludes_unsent_passages_and_keeps_contiguous_ids():
    base = {"passage_status":"EXCERPT_FOUND_CLAIM_UNVERIFIED",
            "sha256":"a"*64, "title":"Fuente", "publisher":"Institución",
            "locator":"p. 1", "url":"https://example.org/doc"}
    a = {**base, "excerpt":"Primero " + "a"*500}
    oversized = {**base, "excerpt":"NO_ENVIADO " + "b"*1300}
    b = {**base, "excerpt":"Segundo " + "c"*400}
    text, selected = drafting.live_context([a, oversized, b])
    assert selected == [a,b]
    assert len(text) <= 1250
    assert a["excerpt"] in text and b["excerpt"] in text
    assert "[E1]" in text and "[E2]" in text
    assert "NO_ENVIADO" not in text and "[E3]" not in text
    assert drafting.live_context([oversized]) == (None, [])
