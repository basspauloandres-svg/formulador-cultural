"""Regresión: afirmaciones y fuentes candidatas en campos pertinentes S02–S15."""
import asyncio
import os
import sys
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.dirname(__file__))
import section_review as review


def test_review_scope_by_function_not_blanket_application():
    assert "S03" in review.REVIEW_FIELDS
    assert "S04" in review.REVIEW_FIELDS
    assert "S07" in review.REVIEW_FIELDS
    assert "S12" in review.REVIEW_FIELDS
    assert "S14" in review.REVIEW_FIELDS
    for section in ("S01", "S06", "S13", "S16"):
        assert section not in review.REVIEW_FIELDS


def test_numeric_population_not_presented_as_verified():
    claim=review.classify_claim("Villamaría tiene 500000 habitantes en 2026.")
    assert claim["classification"] == "USER_ASSERTION_UNVERIFIED"
    assert claim["evidence_status"] == "INSUFFICIENT_EVIDENCE"
    assert claim["requires_source"] is True
    assert claim["supporting_passages"] == []


def test_hypotheses_not_promoted_to_facts():
    result=review.classify_claim("La música podría fortalecer la convivencia.")
    assert result["classification"] == "HYPOTHESIS_UNVERIFIED"
    assert result["evidence_status"] == "INSUFFICIENT_EVIDENCE"


def test_claim_splitting_keeps_original_statements():
    source="Villamaría tiene una banda. La música transforma todo el municipio."
    items=review.split_claims(source)
    assert len(items)==2
    assert "Villamaría" in items[0]
    assert "transforma" in items[1]


def test_source_search_stays_candidate_only_for_population_field():
    payload=review.SectionReviewRequest(section="S03",field="cantidad_estimada",
        text="Villamaría tiene 500000 habitantes.", context="Villamaría, Caldas")
    search_result={"sources":[{"title":"Censo municipal", "url":"https://www.datos.gov.co/d/abcd-1234"}],
                   "errors":[]}
    with patch.object(review, "verified_user", new=AsyncMock(return_value="user")), \
         patch.object(review, "research", new=AsyncMock(return_value=search_result)) as search:
        result=asyncio.run(review.review_section(payload,"Bearer synthetic"))
    assert result["verified_claims"] == []
    assert result["claims"][0]["evidence_status"] == "INSUFFICIENT_EVIDENCE"
    assert result["candidate_sources"][0]["title"] == "Censo municipal"
    assert search.await_args.args[0].field=="principales_dinamicas_sociales"
    assert result["territory_context"]=="Villamaría, Caldas"


def test_fields_not_in_review_are_rejected():
    payload=review.SectionReviewRequest(section="S06",field="valoracion_0_3",
        text="Influencia de valor 3.",context="Villamaría, Caldas")
    with pytest.raises(HTTPException) as exc:
        asyncio.run(review.review_section(payload,"Bearer synthetic"))
    assert exc.value.status_code==422


def test_municipality_mismatch_retained_as_warning():
    payload=review.SectionReviewRequest(section="S05",field="descripcion",
        text="Neira tiene una tradición musical extensa.",
        context="Villamaría, Caldas")
    with patch.object(review, "verified_user", new=AsyncMock(return_value="user")), \
         patch.object(review, "research", new=AsyncMock(return_value={"sources":[],"errors":[]})):
        result=asyncio.run(review.review_section(payload,"Bearer synthetic"))
    assert "Neira" in result["conflicting_municipalities"]
    assert result["territory"]["municipality"]=="Villamaría"


def test_invalid_session_stops_search():
    payload=review.SectionReviewRequest(section="S04",field="evidencia_disponible",
        text="Se ha observado participación musical.",context="Villamaría, Caldas")
    with patch.object(review, "verified_user",new=AsyncMock(side_effect=HTTPException(401,"Sin sesión"))), \
         patch.object(review, "research",new=AsyncMock()) as search:
        with pytest.raises(HTTPException) as exc:
            asyncio.run(review.review_section(payload,""))
    assert exc.value.status_code==401
    search.assert_not_awaited()


def test_villamaria_screenshot_is_split_into_independently_testable_claims():
    original = ("Municipio cerca al casco urbano de Manizales, es un municipio "
                "que se caracteriza por su gastronomía y su proceso musical en bandas.")
    chunks = review.split_claims(original)
    assert len(chunks) == 3
    categories = [review.classify_claim(chunk)["review_category"] for chunk in chunks]
    assert categories == ["TERRITORIO", "GASTRONOMIA", "PRACTICAS_MUSICALES"]
    assert all(review.classify_claim(chunk)["evidence_status"] == "INSUFFICIENT_EVIDENCE"
               for chunk in chunks)


def test_primary_passages_are_not_mislabeled_as_verified_claims():
    payload=review.SectionReviewRequest(section="S02",field="caracteristicas_culturales",
        text="Villamaría tiene bandas de música y gastronomía.",
        context="Villamaría, Caldas")
    candidate={"url":"https://villamaria-caldas.gov.co/MiMunicipio/Paginas/Territorios.aspx",
               "title":"Territorios", "excerpt":"La vereda Gallinazo es un corredor gastronómico.",
               "locator":"Párrafo HTML 24",
               "passage_status":"EXCERPT_FOUND_CLAIM_UNVERIFIED"}
    with patch.object(review, "verified_user", new=AsyncMock(return_value="synthetic")), \
         patch.object(review, "research", new=AsyncMock(return_value={"sources":[],"errors":[]})), \
         patch.object(review, "municipal_passages", new=AsyncMock(return_value=[candidate])) as fetch:
        result=asyncio.run(review.review_section(payload,"Bearer synthetic"))
    assert fetch.await_count == 1
    assert result["primary_passages"][0]["passage_status"] == "EXCERPT_FOUND_CLAIM_UNVERIFIED"
    assert result["verified_claims"] == []
    assert all(x["evidence_status"] == "INSUFFICIENT_EVIDENCE" for x in result["claims"])


def test_one_request_returns_claims_sources_and_editable_proposal():
    req=review.SectionReviewRequest(section="S02", field="caracteristicas_culturales",
        text="Villamaría registra bandas musicales en su territorio.",
        context="Villamaría, Caldas", compose=True)
    source={"title":"Alcaldía", "url":"https://villamaria-caldas.gov.co/example",
            "excerpt":"Se registró una banda musical.","sha256":"a"*64,
            "locator":"Párrafo HTML 7", "passage_status":"EXCERPT_FOUND_CLAIM_UNVERIFIED",
            "category":"PRACTICAS_MUSICALES"}
    generative={"suggestion":"Se registran bandas musicales en Villamaría [POR VERIFICAR].",
                "draft_status":"EDITABLE_UNVERIFIED", "review_flags":[], "evidence_used":[source]}
    with patch.object(review, "verified_user", new=AsyncMock(return_value="test-user")), \
         patch.object(review, "research",new=AsyncMock(return_value={"sources":[],"errors":[]})), \
         patch.object(review, "municipal_passages",new=AsyncMock(return_value=[source])), \
         patch.object(review, "compose_section_draft",new=AsyncMock(return_value=generative)) as model:
        result=asyncio.run(review.review_section(req,"Bearer synthetic"))
    assert result["suggestion"]==generative["suggestion"]
    assert result["draft_status"]=="EDITABLE_UNVERIFIED"
    assert result["verified_claims"]==[]
    assert len(result["claims"])==1
    assert result["claims"][0]["candidate_passages"][0]["source_id"] is None
    assert model.await_args.kwargs["user_id"]=="test-user"
    assert model.await_args.kwargs["passages"]==[source]


def test_review_only_does_not_consume_generative_quota():
    req=review.SectionReviewRequest(section="S03", field="caracterizacion",
        text="Descripción proporcionada por el formador.",context="Villamaría, Caldas")
    with patch.object(review,"verified_user",new=AsyncMock(return_value="user")), \
         patch.object(review,"research",new=AsyncMock(return_value={"sources":[],"errors":[]})), \
         patch.object(review,"compose_section_draft",new=AsyncMock()) as model:
        result=asyncio.run(review.review_section(req,"Bearer synthetic"))
    assert result["draft_status"]=="NOT_REQUESTED"
    model.assert_not_awaited()
