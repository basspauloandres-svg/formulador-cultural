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
