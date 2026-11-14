"""Evaluación determinista del bloqueo de afirmaciones causales de S02."""
import asyncio
import os
import sys
from unittest.mock import AsyncMock, patch
import httpx

sys.path.insert(0, os.path.dirname(__file__))
import claim_audit
import assistant_pilot as pilot


def test_neira_unqualified_causality_is_flagged():
    proposal = ("La posición geográfica influye en su cultura, comercio y música, "
                "generando particularidades que reflejan la diversidad de la región.")
    flags = claim_audit.audit_claims(proposal)
    assert flags
    assert all(flag["status"] == "INSUFFICIENT_EVIDENCE" for flag in flags)
    assert any("influye" in flag["fragment"] for flag in flags)


def test_qualified_hypothesis_not_automatically_flagged():
    proposal = "La posición geográfica podría influir en sus prácticas musicales [POR VERIFICAR]."
    assert claim_audit.audit_claims(proposal) == []


def test_plain_description_is_not_blocked():
    assert claim_audit.audit_claims("El municipio se encuentra en el departamento de Caldas.") == []


class MockClient:
    async def __aenter__(self): return self
    async def __aexit__(self, *args): return False
    async def post(self, *args, **kwargs):
        return httpx.Response(200, json={"choices": [{"message": {"content":
            "Esta posición geográfica influye en la música y genera cohesión social."},
            "finish_reason": "stop"}]})


def test_model_output_with_unverified_causality_is_qualified():
    pilot._times.clear()
    req = pilot.AssistantRequest(
        field="caracteristicas_culturales", section="S02", action="redactar",
        text="Neira es un municipio entre Manizales y Salamina.",
        context="Neira",
    )
    with patch.dict(os.environ, {"GROQ_API_KEY": "synthetic", "GROQ_MODEL": "openai/gpt-oss-20b"}), \
         patch.object(pilot, "verified_user", new=AsyncMock(return_value="synthetic")), \
         patch.object(pilot.httpx, "AsyncClient", return_value=MockClient()):
        result = asyncio.run(pilot.assist(req, "Bearer synthetic-token"))
    pilot._times.clear()
    assert result["blocked_for_evidence"] is False
    assert "Se plantea como hipótesis" in result["suggestion"]
    assert "[POR VERIFICAR]" in result["suggestion"]
    assert result["requires_approval"] is True
    assert result["review_flags"]


def test_only_causal_sentence_is_qualified():
    original = ("La banda municipal participa en encuentros. "
                "La posición geográfica influye en sus prácticas musicales.")
    rewritten, flags = claim_audit.qualify_claims(original)
    assert rewritten.startswith("La banda municipal participa en encuentros.")
    assert "Se plantea como hipótesis por verificar que la posición" in rewritten
    assert flags
