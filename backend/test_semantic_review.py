import asyncio
import json
from hashlib import sha256
from unittest.mock import AsyncMock,patch
import httpx
from citation_audit import audit_citations
from semantic_review import packet, assess_response, review_one

SOURCE="En 2024, el municipio organizó cinco talleres de música."
def fixture(claim="En 2024 se realizaron cinco talleres musicales [F1, p.1]."):
    excerpt="[F1, p.1] "+SOURCE
    manifest=[dict(citation="F1, p.1",kind="pdf",sha256="a"*64,prompt_excerpt=excerpt,excerpt_sha256=sha256(excerpt.encode()).hexdigest())]
    return packet(audit_citations(claim,manifest)[0],manifest)

def response(verdict="ENTAILS",quote=SOURCE,citation="F1,P.1"):
    return json.dumps(dict(verdict=verdict,quote=quote,citation=citation))

def test_semantic_assessment_is_not_verification():
    data=fixture()
    assert assess_response(response(),data)["status"]=="MODEL_ENTAILMENT_REVIEW_REQUIRED"
    assert assess_response(response("CONTRADICTS"),data)["status"]=="MODEL_CONTRADICTION_REVIEW_REQUIRED"
    assert assess_response(response("INSUFFICIENT",""),data)["status"]=="INSUFFICIENT_EVIDENCE"

def test_semantic_review_rejects_fabricated_quote_and_wrong_citation():
    data=fixture()
    for raw in [response(quote="El municipio organizó diez talleres."),response(citation="F1,P.2"),response(quote="el municipio organizó cinco talleres de música."),"not JSON",response("VERIFIED")]:
        assert assess_response(raw,data)["status"]=="INSUFFICIENT_EVIDENCE"

def test_semantic_review_excludes_unknown_and_exact_citations():
    assert fixture("La afirmación carece de respaldo.") is None
    assert fixture("Una afirmación con cita inválida [F1, p.9].") is None
    assert fixture("En 2024, el municipio organizó cinco talleres de música [F1, p.1].") is None

def test_transport_failure_remains_insufficient():
    with patch("semantic_review.httpx.AsyncClient") as client:
        client.return_value.__aenter__.return_value.post=AsyncMock(side_effect=httpx.ReadTimeout("synthetic"))
        result=asyncio.run(review_one(fixture(),"synthetic","synthetic","https://example.test"))
    assert result=={"status":"INSUFFICIENT_EVIDENCE","method":"MODEL_REVIEW_UNAVAILABLE"}
