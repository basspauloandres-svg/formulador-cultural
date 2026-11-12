"""Pruebas sin red del verificador de fragmentos PDF."""
import asyncio
import os
import sys
from io import BytesIO
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from reportlab.pdfgen import canvas

sys.path.insert(0, os.path.dirname(__file__))
import source_verifier as verifier


def synthetic_pdf():
    buf = BytesIO()
    pdf = canvas.Canvas(buf)
    pdf.drawString(40, 760, "La banda estudiantil participa en actividades culturales del municipio.")
    pdf.showPage()
    pdf.save()
    return buf.getvalue()


def test_passage_found_in_pdf_with_page():
    page, total = verifier.locate_excerpt(
        synthetic_pdf(), "La banda estudiantil participa en actividades culturales del municipio.")
    assert (page, total) == (1, 1)


def test_nonexistent_passage_does_not_claim_support():
    page, total = verifier.locate_excerpt(synthetic_pdf(), "La musica produce cohesion social comprobada.")
    assert (page, total) == (None, 1)


@pytest.mark.parametrize("url", [
    "http://mng.mincultura.gov.co/documento.pdf",
    "https://127.0.0.1/file.pdf",
    "https://mng.mincultura.gov.co.evil.net/file.pdf",
    "https://mng.mincultura.gov.co@evil.net/file.pdf",
    "https://mng.mincultura.gov.co/file.pdf?next=http://127.0.0.1",
    "https://mng.mincultura.gov.co/file.html",
])
def test_untrusted_remote_urls_rejected(url):
    with pytest.raises(HTTPException) as exc:
        verifier.validate_pdf_url(url)
    assert exc.value.status_code == 422


class RemoteResponse:
    headers = {"content-type": "application/pdf"}
    def __init__(self, data):
        self.data = data
    async def __aenter__(self): return self
    async def __aexit__(self, *args): return False
    def raise_for_status(self): return None
    async def aiter_bytes(self):
        yield self.data


class MockClient:
    def __init__(self, data):
        self.data = data
    async def __aenter__(self): return self
    async def __aexit__(self, *args): return False
    def stream(self, method, url, headers):
        assert method == "GET"
        return RemoteResponse(self.data)


def test_verified_pdf_excerpt_does_not_verify_claim():
    req = verifier.ExcerptRequest(
        section="S02",
        url="https://mng.mincultura.gov.co/prensa/documento.pdf",
        excerpt="La banda estudiantil participa en actividades culturales del municipio.",
    )
    with patch.object(verifier, "verified_user", new=AsyncMock(return_value="synthetic")), \
         patch.object(verifier, "reserve_research", return_value=True), \
         patch.object(verifier.httpx, "AsyncClient", return_value=MockClient(synthetic_pdf())):
        result = asyncio.run(verifier.verify_excerpt(req, "Bearer token"))
    assert result["passage_status"] == "EXCERPT_FOUND"
    assert result["page"] == 1
    assert len(result["document_sha256"]) == 64
    assert result["claim_status"] == "INSUFFICIENT_EVIDENCE"


def test_endpoint_blocks_unauthenticated_request_before_fetch():
    with patch.object(verifier, "verified_user", new=AsyncMock(side_effect=HTTPException(401, "Sin sesión"))), \
         patch.object(verifier.httpx, "AsyncClient") as client:
        with pytest.raises(HTTPException) as exc:
            asyncio.run(verifier.verify_excerpt(verifier.ExcerptRequest(
                url="https://mng.mincultura.gov.co/file.pdf",
                excerpt="Este fragmento tiene más de veinticinco caracteres."
            ), ""))
    assert exc.value.status_code == 401
    client.assert_not_called()
