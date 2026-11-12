"""Comprobación literal de pasajes en PDF institucionales permitidos.

EXCERPT_FOUND significa coincidencia textual en un documento recuperado, NO apoyo
lógico a una afirmación del usuario. No se ofrece navegación arbitraria (SSRF).
"""
from __future__ import annotations
from hashlib import sha256
from io import BytesIO
import re
import unicodedata
from urllib.parse import urlsplit

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, Field
from pypdf import PdfReader

from assistant_pilot import verified_user
from source_research import reserve_research

ALLOWED_PDF_HOSTS = frozenset({
    "mng.mincultura.gov.co",
    "www.mincultura.gov.co",
    "mincultura.gov.co",
})
MAX_PDF_BYTES = 6_000_000
MAX_PAGES = 35


class ExcerptRequest(BaseModel):
    section: str = "S02"
    url: str = Field(min_length=20, max_length=1000)
    excerpt: str = Field(min_length=25, max_length=350)


def validate_pdf_url(url: str) -> None:
    parts = urlsplit(url)
    if (parts.scheme != "https" or parts.hostname not in ALLOWED_PDF_HOSTS
            or parts.port not in (None, 443)
            or parts.username or parts.password
            or parts.query or parts.fragment
            or not parts.path.casefold().endswith(".pdf")):
        raise HTTPException(422, "Solo se admiten enlaces HTTPS directos a PDF de dominios institucionales autorizados.")


def normalize_excerpt(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).casefold()
    return re.sub(r"\s+", " ", normalized).strip()


def locate_excerpt(pdf_content: bytes, excerpt: str) -> tuple[int | None, int]:
    try:
        reader = PdfReader(BytesIO(pdf_content), strict=False)
        total = len(reader.pages)
        if total > MAX_PAGES:
            raise HTTPException(422, "PDF demasiado extenso para este piloto; verifica el fragmento manualmente.")
        needle = normalize_excerpt(excerpt)
        for i, page in enumerate(reader.pages):
            page_text = normalize_excerpt(page.extract_text() or "")
            if needle in page_text:
                return i + 1, total
        return None, total
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, "No fue posible extraer texto de este PDF. Puede ser escaneado o estar protegido.") from None


async def verify_excerpt(payload: ExcerptRequest, bearer: str) -> dict:
    if payload.section != "S02":
        raise HTTPException(422, "Verificación de pasajes disponible solo en S02.")
    validate_pdf_url(payload.url)
    user_id = await verified_user(bearer)
    if not reserve_research(user_id):
        raise HTTPException(429, "Límite de búsquedas documentales alcanzado.")
    try:
        async with httpx.AsyncClient(timeout=18, follow_redirects=False) as client:
            async with client.stream("GET", payload.url, headers={
                "Accept": "application/pdf",
                "User-Agent": "VerticeSourceVerification/0.1",
            }) as response:
                response.raise_for_status()
                if "pdf" not in response.headers.get("content-type", "").lower():
                    raise HTTPException(422, "El enlace no devolvió un documento PDF.")
                data = bytearray()
                async for chunk in response.aiter_bytes():
                    data.extend(chunk)
                    if len(data) > MAX_PDF_BYTES:
                        raise HTTPException(422, "El PDF supera el límite de tamaño permitido.")
    except HTTPException:
        raise
    except httpx.HTTPError:
        raise HTTPException(502, "El documento institucional no respondió. Comprueba el enlace.") from None
    if not bytes(data).startswith(b"%PDF"):
        raise HTTPException(422, "El archivo recibido no tiene formato PDF.")
    page, total_pages = locate_excerpt(bytes(data), payload.excerpt)
    matched = page is not None
    return {
        "section": "S02",
        "source_url": payload.url,
        "document_sha256": sha256(data).hexdigest(),
        "page": page,
        "total_pages": total_pages,
        "excerpt": payload.excerpt if matched else "",
        "passage_status": "EXCERPT_FOUND" if matched else "EXCERPT_NOT_FOUND",
        "claim_status": "INSUFFICIENT_EVIDENCE",
        "note": ("Coincidencia textual comprobada en página indicada. "
                 "El apoyo lógico a una afirmación requiere evaluación humana."
                 if matched else
                 "No se encontró coincidencia literal; esto no demuestra que el documento carezca del tema."),
    }
