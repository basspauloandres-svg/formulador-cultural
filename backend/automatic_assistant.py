"""Orquestador automático de acompañamiento S02.

El participante aporta solo su municipio y texto; ninguna URL ni cita manual.
Los enlaces de catálogo son candidatos y no se convierten en afirmaciones verificadas.
"""
from __future__ import annotations

from hashlib import sha256
from io import BytesIO
import re

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, Field
from pypdf import PdfReader

from assistant_pilot import AssistantRequest, assist
from source_research import ResearchRequest, research
from source_verifier import validate_pdf_url, MAX_PDF_BYTES, MAX_PAGES

# Registro provisional de documentos institucionales identificados por municipio.
# La existencia de una URL no implica accesibilidad ni validez de su contenido.
INSTITUTIONAL_DOCUMENTS = {
    ("neira", "caldas"): [{
        "id": "NEIRA-MINCULTURA-2016",
        "title": "Ficha territorial municipal (2016)",
        "publisher": "Ministerio de Cultura de Colombia",
        "year": 2016,
        "url": "https://mng.mincultura.gov.co/prensa/noticias/Documents/Fomento/FichaTerritorial_17486_2016_SIFO.pdf",
        "topics": ("caracteristicas_culturales", "antecedentes"),
    }]
}

TOPIC_KEYWORDS = {
    "caracteristicas_culturales": ("cultura", "musica", "musical", "fiesta", "banda", "artistic", "patrimonio"),
    "antecedentes": ("programa", "proyecto", "cultura", "banda", "musica"),
}

GUIDANCE = {
    "territorio_o_lugar_de_intervencion": (
        "Delimita municipio, sector urbano o rural y lugar concreto de la acción.",
        "Contrasta la delimitación con información institucional actualizada.",
    ),
    "caracteristicas_culturales": (
        "Describe las prácticas y expresiones culturales conocidas por el formador.",
        "Distingue experiencia local, datos documentados e hipótesis sobre su relación con el territorio.",
        "Identifica agentes, espacios o celebraciones únicamente si tienen respaldo.",
    ),
    "principales_dinamicas_sociales": (
        "Identifica condiciones sociales pertinentes para el problema del proyecto.",
        "Especifica la población vinculada y evita confundir habitantes totales con beneficiarios.",
    ),
    "antecedentes": (
        "Describe iniciativas previas e indica responsables, fechas y resultados.",
        "Separa experiencias relatadas de antecedentes documentados.",
    ),
}


class GuidedRequest(BaseModel):
    section: str = "S02"
    field: str = Field(max_length=100)
    text: str = Field(min_length=10, max_length=1800)
    context: str = Field(min_length=2, max_length=200)
    include_web: bool = True
    generate: bool = True


def municipality_key(context: str) -> tuple[str, str] | None:
    """Solo coincide con municipios registrados y departamento explícito."""
    value = re.sub(r"[^a-z0-9]+", " ", context.casefold())
    if re.search(r"\bneira\b", value) and re.search(r"\bcaldas\b", value):
        return ("neira", "caldas")
    return None


def clean_text(value: str) -> str:
    import unicodedata
    value = unicodedata.normalize("NFKD", value.casefold())
    return "".join(c for c in value if not unicodedata.combining(c))


def passages_from_pdf(content: bytes, field: str) -> list[dict]:
    """Fragmentos documentales para revisión, no afirmaciones corroboradas."""
    try:
        reader = PdfReader(BytesIO(content), strict=False)
        if len(reader.pages) > MAX_PAGES:
            return []
        terms = TOPIC_KEYWORDS.get(field, ())
        records = []
        for page_num, page in enumerate(reader.pages, 1):
            body = (page.extract_text() or "").replace("\x00", " ")
            for line in body.splitlines():
                normalized = clean_text(line)
                if (30 <= len(line.strip()) <= 320 and any(term in normalized for term in terms)
                        and len(records) < 3):
                    records.append({"page": page_num, "excerpt": " ".join(line.split())[:300]})
            if len(records) >= 3:
                break
        return records
    except Exception:
        return []


async def fetch_document(record: dict, field: str) -> dict | None:
    url = record["url"]
    validate_pdf_url(url)
    try:
        async with httpx.AsyncClient(timeout=12, follow_redirects=False) as client:
            async with client.stream("GET", url, headers={
                "Accept": "application/pdf", "User-Agent": "VerticeResearchAssistant/0.2",
            }) as response:
                response.raise_for_status()
                if "pdf" not in response.headers.get("content-type", "").casefold():
                    return None
                content = bytearray()
                async for part in response.aiter_bytes():
                    content.extend(part)
                    if len(content) > MAX_PDF_BYTES:
                        return None
    except httpx.HTTPError:
        return None
    data = bytes(content)
    if not data.startswith(b"%PDF"):
        return None
    passages = passages_from_pdf(data, field)
    if not passages:
        return None
    return {**record, "document_sha256": sha256(data).hexdigest(),
            "passages": passages, "status": "PASSAGES_EXTRACTED_CLAIMS_UNVERIFIED"}


async def guide(req: GuidedRequest, bearer: str) -> dict:
    if req.section != "S02" or req.field not in GUIDANCE:
        raise HTTPException(422, "La asistencia automática está limitada a S02.")
    # research() verifica sesión y consume únicamente la cuota de investigación.
    found = await research(ResearchRequest(section="S02", field=req.field,
        text=req.text, context=req.context, include_web=req.include_web), bearer)
    key = municipality_key(req.context)
    docs = []
    for record in INSTITUTIONAL_DOCUMENTS.get(key, []):
        if req.field in record["topics"]:
            doc = await fetch_document(record, req.field)
            if doc:
                docs.append(doc)
    # Los resultados de catálogo permanecen sin verificar y no ingresan al prompt.
    suggestion = None
    blocked = False
    flags = []
    if docs and req.generate:
        excerpts = []
        for doc in docs[:1]:
            for passage in doc["passages"][:3]:
                excerpts.append(f"[F1, p.{passage['page']}] {passage['excerpt']}")
        evidence = "\n".join(excerpts)[:950]
        try:
            generative = await assist(AssistantRequest(section="S02", field=req.field,
                text=req.text, context=req.context, action="redactar"), bearer,
                evidence=evidence)
            suggestion = generative["suggestion"] or None
            blocked = generative.get("blocked_for_evidence", False)
            flags = generative.get("review_flags", [])
            # Solo se permiten localizadores de las páginas recuperadas.
            allowed_pages = {p["page"] for d in docs for p in d["passages"]}
            cited_pages = [int(value) for value in re.findall(r"\\[F1,\\s*p\\.(\\d+)\\]", suggestion or "")]
            if any(page not in allowed_pages for page in cited_pages):
                suggestion = None
                blocked = True
                flags.append({"type": "UNVERIFIED_CITATION",
                              "instruction": "El modelo citó una página ausente en los pasajes recuperados."})
        except HTTPException as exc:
            # Una caída o cuota del proveedor no debe impedir orientar al formador.
            if exc.status_code not in (429, 502, 503, 504):
                raise
            suggestion = None
    return {
        "section": "S02", "field": req.field,
        "guidance": list(GUIDANCE[req.field]),
        "sources": docs,
        "candidate_sources": found["sources"],
        "errors": found["errors"],
        "suggestion": suggestion,
        "blocked_for_evidence": blocked,
        "review_flags": flags,
        "requires_approval": True,
        "claim_status": "INSUFFICIENT_EVIDENCE",
        "note": ("Los pasajes fueron extraídos de un PDF institucional con página y huella. "
                 "Las afirmaciones e interpretaciones siguen sujetas a revisión humana."
                 if docs else
                 "Sin pasajes primarios recuperados para este campo. "
                 "Se ofrece orientación de formulación sin inventar datos.")
    }
