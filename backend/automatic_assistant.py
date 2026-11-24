"""Orquestador automático de acompañamiento S02.

El participante aporta solo su municipio y texto; ninguna URL ni cita manual.
Los enlaces de catálogo son candidatos y no se convierten en afirmaciones verificadas.
"""
from __future__ import annotations

from hashlib import sha256
from io import BytesIO
import re
import asyncio
from time import monotonic
from collections import OrderedDict

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, Field
from pypdf import PdfReader

from assistant_pilot import AssistantRequest, assist
from source_research import ResearchRequest, research
from source_verifier import validate_pdf_url, MAX_PDF_BYTES, MAX_PAGES
from municipal_sources import municipal_passages
from territory_registry import resolve_territory, normalized as territory_normalized

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

# Directorios institucionales; el código identifica el municipio, no su población.
TERRITORIAL_IDENTITIES = {
    ("villamaria", "caldas"): {
        "municipality": "Villamaría", "department": "Caldas",
        "divipola": "17873", "publisher": "Alcaldía de Villamaría",
        "url": "https://www.villamaria-caldas.gov.co/MiMunicipio/Paginas/Mi-Municipio.aspx",
        "year": None, "status": "IDENTIFICACION_TERRITORIAL_REFERENCIADA",
    },
    ("neira", "caldas"): {
        "municipality": "Neira", "department": "Caldas",
        "divipola": "17486", "publisher": "Ministerio de Cultura de Colombia",
        "url": "https://mng.mincultura.gov.co/prensa/noticias/Documents/Fomento/FichaTerritorial_17486_2016_SIFO.pdf",
        "year": 2016, "status": "IDENTIFICACION_TERRITORIAL_REFERENCIADA",
    },
}

TOPIC_KEYWORDS = {
    "territorio_o_lugar_de_intervencion": ("municipio", "territorio", "vereda", "ubicacion", "ordenamiento"),
    "principales_dinamicas_sociales": ("comunidad", "poblacion", "participacion", "convivencia", "educacion"),
    "caracteristicas_culturales": (
        "banda", "musica", "musical", "fiesta", "festival", "danza",
        "teatro", "biblioteca", "museo", "artesania", "escuela de arte",
    ),
    "antecedentes": ("programa", "proyecto", "banda", "musica", "festival"),
}

GUIDANCE = {
    "territorio_o_lugar_de_intervencion": (
        "Delimita municipio, sector urbano o rural y lugar concreto de la acción.",
        "Contrasta la delimitación con información institucional actualizada.",
    ),
    "caracteristicas_culturales": (
        "Investiga las prácticas y expresiones culturales del territorio; los aportes del formador son opcionales.",
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
    text: str = Field(default="", max_length=1800)
    context: str = Field(min_length=2, max_length=200)
    include_web: bool = True
    generate: bool = True


def municipality_key(context: str) -> tuple[str, str] | None:
    """Resolución acotada: nombre exacto, o nombre y departamento explícito."""
    value = re.sub(r"[^a-z0-9]+", " ", clean_text(context)).strip()
    for municipality, department in TERRITORIAL_IDENTITIES:
        if value in (municipality, "municipio de " + municipality):
            return municipality, department
        if re.fullmatch(r"(?:municipio de )?" + municipality +
                        r"(?: departamento de)? " + department, value):
            return municipality, department
    return None


def clean_text(value: str) -> str:
    import unicodedata
    value = unicodedata.normalize("NFKD", value.casefold())
    return "".join(c for c in value if not unicodedata.combining(c))


def passages_from_pdf(content: bytes, field: str, municipality: str = "") -> list[dict]:
    """Extrae fragmentos coherentes y concretos, evita renglones sueltos.

    Busca expresiones de práctica cultural; una referencia genérica al
    Paisaje Cultural Cafetero no caracteriza por sí sola la música local.
    """
    try:
        reader = PdfReader(BytesIO(content), strict=False)
        if len(reader.pages) > MAX_PAGES:
            return []
        terms = TOPIC_KEYWORDS.get(field, ())
        matches = []
        for page_num, page in enumerate(reader.pages, 1):
            body = (page.extract_text() or "").replace("\\x00", " ")
            lines = [" ".join(line.split()) for line in body.splitlines() if line.strip()]
            for index, line in enumerate(lines):
                compact = clean_text(line)
                if not any(term in compact for term in terms):
                    continue
                # Se incluyen líneas adyacentes como contexto; no se finge
                # continuidad cuando el PDF presenta columnas o tablas.
                before = lines[index - 1] if index > 0 else ""
                after = lines[index + 1] if index + 1 < len(lines) else ""
                passage = " ".join((before, line, after)).strip()[:470]
                if len(passage) < 35:
                    continue
                local = bool(municipality and clean_text(municipality) in clean_text(passage))
                specificity = sum(term in clean_text(passage) for term in terms)
                matches.append((local, specificity, page_num, passage))
        matches.sort(key=lambda item: (-int(item[0]), -item[1], item[2]))
        seen = set()
        result = []
        for _, _, page_num, passage in matches:
            if (page_num, passage) in seen:
                continue
            seen.add((page_num, passage))
            result.append({"page": page_num, "excerpt": passage})
            if len(result) == 3:
                break
        return result
    except Exception:
        return []

async def _fetch_document(record: dict, field: str) -> dict | None:
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
    passages = passages_from_pdf(data, field, record.get("municipality", ""))
    if not passages:
        return None
    return {**record, "document_sha256": sha256(data).hexdigest(),
            "passages": passages, "status": "PASSAGES_EXTRACTED_CLAIMS_UNVERIFIED"}


# Caché acotada de documentos públicos; nunca almacena aportes ni borradores.
_PUBLIC_DOC_CACHE = OrderedDict()
_PUBLIC_DOC_LOCK = asyncio.Lock()
_PUBLIC_DOC_TTL = 3600
_PUBLIC_DOC_MAX = 128

_PUBLIC_DOC_INFLIGHT = {}
_PUBLIC_DOC_DOWNLOADS = asyncio.Semaphore(4)

async def _load_public_document(key, record, field):
    try:
        async with _PUBLIC_DOC_DOWNLOADS:
            doc = await _fetch_document(record, field)
        if doc:
            public_data = {k: doc[k] for k in ("document_sha256", "passages", "status")}
            async with _PUBLIC_DOC_LOCK:
                _PUBLIC_DOC_CACHE[key] = (monotonic(), public_data)
                _PUBLIC_DOC_CACHE.move_to_end(key)
                while len(_PUBLIC_DOC_CACHE) > _PUBLIC_DOC_MAX:
                    _PUBLIC_DOC_CACHE.popitem(last=False)
            return public_data
        return None
    finally:
        async with _PUBLIC_DOC_LOCK:
            _PUBLIC_DOC_INFLIGHT.pop(key, None)

async def fetch_document(record: dict, field: str) -> dict | None:
    validate_pdf_url(record["url"])
    key = (record["url"], field, record.get("municipality", ""))
    async with _PUBLIC_DOC_LOCK:
        cached = _PUBLIC_DOC_CACHE.get(key)
        if cached and monotonic() - cached[0] < _PUBLIC_DOC_TTL:
            _PUBLIC_DOC_CACHE.move_to_end(key)
            return {**record, **cached[1]}
        task = _PUBLIC_DOC_INFLIGHT.get(key)
        if task is None:
            task = asyncio.create_task(_load_public_document(key, record, field))
            _PUBLIC_DOC_INFLIGHT[key] = task
    public_data = await asyncio.shield(task)
    return {**record, **public_data} if public_data else None

async def guide(req: GuidedRequest, bearer: str) -> dict:
    if req.section != "S02" or req.field not in GUIDANCE:
        raise HTTPException(422, "La asistencia automática está limitada a S02.")
    # research() verifica sesión y consume únicamente la cuota de investigación.
    search_text = req.text.strip() if len(req.text.strip()) >= 10 else ("Información territorial de " + req.context)
    found = await research(ResearchRequest(section="S02", field=req.field,
        text=search_text, context=req.context, include_web=req.include_web), bearer)
    territorial_result = await resolve_territory(req.context)
    identity = territorial_result.get("identity")
    key = ((territory_normalized(identity["municipality"]),
            territory_normalized(identity["department"])) if identity else None)
    docs = []
    for record in INSTITUTIONAL_DOCUMENTS.get(key, []):
        if req.field in record["topics"]:
            doc = await fetch_document(record, req.field)
            if doc:
                docs.append(doc)
    # Recuperación acotada de candidatos PDF en dominios explícitamente autorizados.
    # Un candidato sin acceso o sin pasajes sigue siendo únicamente un candidato.
    if identity and not docs:
        attempted = 0
        for candidate in found["sources"]:
            url = candidate.get("url", "")
            try:
                validate_pdf_url(url)
            except HTTPException:
                continue
            if attempted >= 2:
                break
            attempted += 1
            record = {**candidate, "municipality": identity["municipality"]}
            doc = await fetch_document(record, req.field)
            if doc:
                docs.append(doc)
                break
    # Rutas municipales HTML: las referencias preindexadas se muestran, pero
    # jamás se inyectan como pruebas en el prompt generativo.
    text_normalized = clean_text(req.text)
    topics = {
        "territorio_o_lugar_de_intervencion": {"TERRITORIO"},
        "caracteristicas_culturales": {"PRACTICAS_MUSICALES", "GASTRONOMIA"},
        "principales_dinamicas_sociales": {"PRACTICAS_MUSICALES"},
        "antecedentes": {"PRACTICAS_MUSICALES"},
    }[req.field].copy()
    if re.search(r"manizales|cerca|ubicad|territor|l[ií]mite|casco", text_normalized):
        topics.add("TERRITORIO")
    if re.search(r"gastronom|plato|culinari", text_normalized):
        topics.add("GASTRONOMIA")
    if re.search(r"music|banda|orquesta|agrupacion", text_normalized):
        topics.add("PRACTICAS_MUSICALES")
    local_references = await municipal_passages(key, topics) if topics else []
    live_passages = [p for p in local_references
                    if p.get("passage_status") == "EXCERPT_FOUND_CLAIM_UNVERIFIED"
                    and p.get("sha256") and p.get("excerpt")]
    # Aviso si el texto conserva explícitamente otro municipio tras un cambio.
    conflicts = [TERRITORIAL_IDENTITIES[other]["municipality"]
                 for other in TERRITORIAL_IDENTITIES
                 if other != key and re.search(r"\b" + other[0] + r"\b", text_normalized)]
    territory_flags = ([{
        "type": "TERRITORY_MISMATCH", "status": "INSUFFICIENT_EVIDENCE",
        "instruction": ("El texto menciona " + ", ".join(conflicts)
                        + ", pero el municipio registrado es " + req.context
                        + ". Confirma si se trata de una comparación o de contenido anterior.")
    }] if conflicts else [])
    # Los resultados de catálogo permanecen sin verificar y no ingresan al prompt.
    suggestion = None
    blocked = False
    flags = list(territory_flags)
    if req.generate:
        excerpts = []
        for doc in docs[:1]:
            for passage in doc["passages"][:3]:
                excerpts.append(f"[F1, p.{passage['page']}] {passage['excerpt']}")
        for i, passage in enumerate(live_passages[:2], 1):
            excerpts.append(
                f"[M{i}] Fuente: {passage['publisher']}; "
                f"{passage['title']}; {passage['url']}; "
                f"{passage['locator']}; Extracto: {passage['excerpt']}"
            )
        selected = []
        for excerpt in excerpts:
            if len("\n".join(selected + [excerpt])) <= 1400:
                selected.append(excerpt)
        evidence = "\n".join(selected) or None
        if len(req.text.strip()) < 10 and not evidence:
            blocked = True
            flags.append({"type": "NO_RECOVERED_EVIDENCE", "status": "INSUFFICIENT_EVIDENCE",
                          "instruction": "La búsqueda no recuperó pasajes pertinentes. Revisa las fuentes candidatas antes de formular afirmaciones."})
        try:
            if blocked:
                raise HTTPException(503, "Sin evidencia recuperada")
            generative = await assist(AssistantRequest(section="S02", field=req.field,
                text=req.text, context=req.context, action="redactar"), bearer,
                evidence=evidence)
            suggestion = generative["suggestion"] or None
            blocked = generative.get("blocked_for_evidence", False)
            flags.extend(generative.get("review_flags", []))
            # Solo se permiten localizadores de las páginas recuperadas.
            allowed_pages = {int(n) for n in re.findall(r"^\[F1, p\.(\d+)\]", evidence or "", re.M)}
            allowed_municipal = {int(n) for n in re.findall(r"^\[M(\d+)\]", evidence or "", re.M)}
            cited_pages = [int(value) for value in re.findall(r"\[F1,\s*p\.(\d+)\]", suggestion or "")]
            indexed_citations = re.findall(r"\[M(\d+)\]", suggestion or "")
            invalid_municipal = any(int(n) not in allowed_municipal
                                    for n in indexed_citations)
            if (invalid_municipal or any(page not in allowed_pages for page in cited_pages)
                    or (len(req.text.strip()) < 10 and suggestion and not (cited_pages or indexed_citations))):
                suggestion = None
                blocked = True
                flags.append({"type": "UNVERIFIED_CITATION",
                              "instruction": "La propuesta carece de una cita requerida o cita un pasaje ausente del contexto entregado."})
        except HTTPException as exc:
            # Una caída o cuota del proveedor no debe impedir orientar al formador.
            if exc.status_code not in (429, 502, 503, 504):
                raise
            suggestion = None
            if not blocked:
                flags.append({"type": "GENERATION_UNAVAILABLE", "instruction": "La asistencia generativa está temporalmente indisponible."})
    return {
        "section": "S02", "field": req.field,
        "territory": identity,
        "territory_resolution": territorial_result["status"],
        "territory_candidates": territorial_result.get("candidates", []),
        "territory_context": req.context,
        "guidance": list(GUIDANCE[req.field]),
        "sources": docs,
        "municipal_references": local_references,
        "evidence_input_status": ("LIVE_PASSAGES_AVAILABLE" if live_passages or docs
                                  else "NO_LIVE_PASSAGES"),
        "candidate_sources": found["sources"],
        "errors": found["errors"],
        "suggestion": suggestion,
        "blocked_for_evidence": blocked,
        "review_flags": flags,
        "requires_approval": True,
        "claim_status": "INSUFFICIENT_EVIDENCE",
        "note": ("Se recuperaron pasajes documentales con localizador y huella. "
                 "Las afirmaciones e interpretaciones siguen sujetas a revisión humana."
                 if docs or live_passages else
                 "Sin pasajes primarios recuperados para este campo. "
                 "Se ofrece orientación de formulación sin inventar datos.")
    }
