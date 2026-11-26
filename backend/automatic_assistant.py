"""Orquestador automático de acompañamiento S02.

El participante aporta solo su municipio y texto; ninguna URL ni cita manual.
Los enlaces de catálogo son candidatos y no se convierten en afirmaciones verificadas.
"""
from __future__ import annotations

from hashlib import sha256
from io import BytesIO
import re
import asyncio
import os
from time import monotonic
from collections import OrderedDict
from copy import deepcopy

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, Field
from pypdf import PdfReader

from assistant_pilot import AssistantRequest, assist, groq_key, reserve, verified_user, GROQ_ENDPOINT
from source_research import ResearchRequest, research
from source_verifier import validate_pdf_url, MAX_PDF_BYTES, MAX_PAGES
from municipal_sources import municipal_passages
from institutional_sources import has_private_contact, institutional_passages
from national_sources import cultural_registry
from citation_audit import audit_citations
from semantic_review import packet, review_one
from prompt_boundary import contains_directive, quarantine_flag
from territory_registry import resolve_territory, normalized as territory_normalized, cached_explicit_conflicts

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
        "Consulta datos demográficos, educación, acceso a actividades culturales y condiciones de participación pertinentes al proyecto.",
        "Si faltan fuentes, delimita preguntas de investigación; evita atribuir al municipio migración, pobreza o empleo sin respaldo.",
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
                if len(passage) < 35 or has_private_contact(passage):
                    continue
                local = bool(municipality and re.search(r"\b" + re.escape(clean_text(municipality)) + r"\b", clean_text(passage)))
                if municipality and not local:
                    continue
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
_PUBLIC_DOC_STATS = dict(hits=0, misses=0, joined=0, downloads=0, failures=0, evictions=0)
_PUBLIC_DOC_MAX_INFLIGHT = 32

def public_document_cache_stats():
    """Aggregate process-local counters; no URLs, context or participant data."""
    return {**_PUBLIC_DOC_STATS, "entries": len(_PUBLIC_DOC_CACHE),
            "inflight": len(_PUBLIC_DOC_INFLIGHT)}

async def _load_public_document(key, record, field):
    try:
        async with _PUBLIC_DOC_DOWNLOADS:
            _PUBLIC_DOC_STATS["downloads"] += 1
            doc = await _fetch_document(record, field)
        if doc:
            public_data = {k: doc[k] for k in ("document_sha256", "passages", "status")}
            async with _PUBLIC_DOC_LOCK:
                _PUBLIC_DOC_CACHE[key] = (monotonic(), public_data)
                _PUBLIC_DOC_CACHE.move_to_end(key)
                while len(_PUBLIC_DOC_CACHE) > _PUBLIC_DOC_MAX:
                    _PUBLIC_DOC_CACHE.popitem(last=False)
                    _PUBLIC_DOC_STATS["evictions"] += 1
            return public_data
        _PUBLIC_DOC_STATS["failures"] += 1
        return None
    except Exception:
        _PUBLIC_DOC_STATS["failures"] += 1
        raise
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
            _PUBLIC_DOC_STATS["hits"] += 1
            return {**record, **deepcopy(cached[1])}
        if cached:
            _PUBLIC_DOC_CACHE.pop(key, None)
        task = _PUBLIC_DOC_INFLIGHT.get(key)
        if task is None:
            if len(_PUBLIC_DOC_INFLIGHT) >= _PUBLIC_DOC_MAX_INFLIGHT:
                return None
            _PUBLIC_DOC_STATS["misses"] += 1
            # Never pass arbitrary caller metadata into shared background work.
            public_record = {"url": record["url"], "municipality": record.get("municipality", "")}
            task = asyncio.create_task(_load_public_document(key, public_record, field))
            _PUBLIC_DOC_INFLIGHT[key] = task
        else:
            _PUBLIC_DOC_STATS["joined"] += 1
    public_data = await asyncio.shield(task)
    return {**record, **deepcopy(public_data)} if public_data else None

def research_only_input(text: str) -> bool:
    """Recognize requests for research, not assertions. Conservative full-match.
    Mixed text retains its original status; this is not semantic classification.
    """
    value = re.sub(r"[^a-z0-9 ]+", " ", clean_text(text))
    value = " ".join(value.split())
    if len(value) < 10:
        return True
    command = r"(?:por favor )?(?:investiga(?:r)?|busca(?:r)?|consulta(?:r)?|averigua(?:r)?|ayudame a investigar)(?: (?:por favor|sobre .+|las? .+|los? .+|informacion .+))?"
    unknown = r"(?:no conozco|no se|desconozco|no tengo informacion sobre|no tengo datos sobre)(?: (?:las? |los? |el )?[a-z0-9 ]+)?"
    # Explicit lack of knowledge followed by a research command, or command alone.
    return bool(re.fullmatch(command, value) or
                re.fullmatch(unknown + r" (?:por favor )?(?:investiga|busca|consulta|averigua)(?: por favor)?", value) or
                re.fullmatch(r"(?:no se|no conozco|desconozco|no tengo informacion|no tengo datos)", value))

async def guide(req: GuidedRequest, bearer: str) -> dict:
    if req.section != "S02" or req.field not in GUIDANCE:
        raise HTTPException(422, "La asistencia automática está limitada a S02.")
    research_only = research_only_input(req.text)
    participant_text = "" if research_only else req.text
    # research() verifica sesión y consume únicamente la cuota de investigación.
    search_text = participant_text.strip() if len(participant_text.strip()) >= 10 else ("Información territorial de " + req.context)
    found = await research(ResearchRequest(section="S02", field=req.field,
        text=search_text, context=req.context, include_web=req.include_web), bearer)
    territorial_result = await resolve_territory(req.context)
    identity = territorial_result.get("identity")
    key = ((territory_normalized(identity["municipality"]),
            territory_normalized(identity["department"])) if identity else None)
    national_records = None
    if identity and req.field == "caracteristicas_culturales":
        national_records = await cultural_registry(identity["divipola"])
    docs = []
    for record in INSTITUTIONAL_DOCUMENTS.get(key, []):
        if req.field in record["topics"]:
            doc = await fetch_document({**record, "municipality": identity["municipality"]}, req.field)
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
    local_references = await municipal_passages(key, topics) if key and topics else []
    if req.include_web and key and req.field in {'caracteristicas_culturales', 'antecedentes'}:
        regional = await institutional_passages(key, topics, found['sources'])
        local_references = regional + local_references
    live_passages = [p for p in local_references
                    if p.get("passage_status") == "EXCERPT_FOUND_CLAIM_UNVERIFIED"
                    and p.get("sha256") and p.get("excerpt")]
    # Aviso si el texto conserva explícitamente otro municipio tras un cambio.
    conflicts = [TERRITORIAL_IDENTITIES[other]["municipality"]
                 for other in TERRITORIAL_IDENTITIES
                 if other != key and re.search(r"\b" + other[0] + r"\b", text_normalized)]
    national_conflicts = cached_explicit_conflicts(req.text, identity['divipola']) if identity else []
    conflicts = list(dict.fromkeys(conflicts + [r['municipality']+', '+r['department'] for r in national_conflicts]))
    territory_flags = ([{
        "type": "TERRITORY_MISMATCH", "status": "INSUFFICIENT_EVIDENCE",
        "instruction": ("El texto menciona " + ", ".join(conflicts)
                        + ", pero el municipio registrado es " + req.context
                        + ". Confirma si se trata de una comparación o de contenido anterior.")
    }] if conflicts else [])
    # El registro nacional aporta únicamente el hecho de que existen filas
    # asociadas al código; no se transmiten textos externos ni conteos totales.
    national_evidence = None
    if (national_records and national_records["status"] == "RECORDS_RETRIEVED"
            and national_records.get("records") and national_records.get("response_sha256")):
        national_evidence = (
            "[N1] El conjunto administrativo eenq-ga7s de Datos Abiertos Colombia "
            "contiene registros de organizaciones y entidades del sector Cultura "
            f"asociados al código DIVIPOLA {identity['divipola']}. "
            "Este registro no demuestra actividad actual, cantidad total ni prácticas culturales."
        )
    # Los resultados de catálogo permanecen sin verificar y no ingresan al prompt.
    suggestion = None
    blocked = False
    flags = list(territory_flags)
    evidence_manifest = []
    claim_audit = []
    suggestion_origin = None
    if req.generate:
        excerpts = [national_evidence] if national_evidence else []
        provenance = []
        if national_evidence:
            provenance.append({"citation":"N1","kind":"administrative_registry",
                "url":"https://www.datos.gov.co/resource/eenq-ga7s.json",
                "sha256":national_records["response_sha256"],"divipola":identity["divipola"],
                "locator":identity["divipola"],"scope":"RECORD_EXISTENCE_ONLY"})
        for doc in docs[:1]:
            for passage in doc["passages"][:3]:
                excerpts.append(f"[F1, p.{passage['page']}] Fecha del documento: {doc.get('year') or 'no determinada'}. Extracto: {passage['excerpt']}")
                provenance.append({"citation":f"F1, p.{passage['page']}","kind":"pdf",
                    "url":doc["url"],"sha256":doc.get("document_sha256"),
                    "locator":passage["page"],"publication_year":doc.get("year"),"divipola":identity["divipola"],
                    "scope":"EXCERPT_UNVERIFIED"})
        for i, passage in enumerate(live_passages[:2], 1):
            provenance.append({"citation":f"M{i}","kind":"municipal_html",
                "url":passage["url"],"sha256":passage["sha256"],
                "locator":passage["locator"],"publication_date":passage.get("publication_date"),"divipola":identity["divipola"],
                "scope":"EXCERPT_UNVERIFIED"})
            excerpts.append(
                f"[M{i}] Fuente: {passage['publisher']}; "
                f"{passage['title']}; {passage['url']}; "
                f"{passage['locator']}; fecha: {passage.get('publication_date') or 'no determinada'}; Extracto: {passage['excerpt']}"
            )
        selected = []
        # Preserve N1 first for the existing citation contract; dated HTML ahead of historical PDF.
        pairs = list(zip(excerpts, provenance, strict=True))
        pairs.sort(key=lambda pair: (0 if pair[1]['kind']=='administrative_registry' else 1 if pair[1].get('publication_date') else 2))
        for excerpt, source in pairs:
            # Do not change an excerpt after hashing/manifest creation.
            if contains_directive(excerpt):
                flags.append(quarantine_flag())
                continue
            if not re.fullmatch(r"[0-9a-f]{64}", source.get("sha256") or ""):
                continue
            if len("\n".join(selected + [excerpt])) <= 2200:
                selected.append(excerpt)
                evidence_manifest.append({**source, "prompt_excerpt":excerpt,
                    "excerpt_sha256":sha256(excerpt.encode("utf-8")).hexdigest()})
        evidence = "\n".join(selected) or None
        if research_only and not evidence:
            blocked = True
            flags.append({"type": "NO_RECOVERED_EVIDENCE", "status": "INSUFFICIENT_EVIDENCE",
                          "instruction": "La búsqueda no recuperó pasajes pertinentes. Revisa las fuentes candidatas antes de formular afirmaciones."})
        try:
            if blocked:
                raise HTTPException(503, "Sin evidencia recuperada")
            generative = await assist(AssistantRequest(section="S02", field=req.field,
                text=participant_text, context=req.context, action="redactar"), bearer,
                evidence=evidence)
            suggestion = generative["suggestion"] or None
            suggestion_origin = generative.get("suggestion_origin", "MODEL_DRAFT_UNVERIFIED") if suggestion else None
            blocked = generative.get("blocked_for_evidence", False)
            flags.extend(generative.get("review_flags", []))
            # Solo se permiten localizadores de las páginas recuperadas.
            allowed_pages = {int(n) for n in re.findall(r"^\[F1, p\.(\d+)\]", evidence or "", re.M)}
            allowed_municipal = {int(n) for n in re.findall(r"^\[M(\d+)\]", evidence or "", re.M)}
            cited_pages = [int(value) for value in re.findall(r"\[F1,\s*p\.(\d+)\]", suggestion or "")]
            indexed_citations = re.findall(r"\[M(\d+)\]", suggestion or "")
            invalid_municipal = any(int(n) not in allowed_municipal
                                    for n in indexed_citations)
            national_citations = re.findall(r"\[N(\d+)\]", suggestion or "")
            invalid_national = any(n != "1" or not evidence or not evidence.startswith("[N1]")
                                   for n in national_citations)
            if (invalid_national or invalid_municipal or any(page not in allowed_pages for page in cited_pages)
                    or (research_only and suggestion and not (cited_pages or indexed_citations or national_citations))):
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
    claim_audit = audit_citations(suggestion, evidence_manifest)
    # A registry-only input supports one narrow administrative proposition.
    # Retain the model output only if it exactly matches that proposition;
    # otherwise offer a deterministic statement, never attributed to the model.
    if (suggestion and not blocked and research_only and
            evidence_manifest and all(item["kind"] == "administrative_registry" for item in evidence_manifest) and
            any(item["status"] == "INSUFFICIENT_EVIDENCE" for item in claim_audit) and
            not any(item["status"] == "INVALID_PROVENANCE" for item in claim_audit)):
        fact = national_evidence.split(". ", 1)[0].removeprefix("[N1] ")
        suggestion = fact + " [N1]."
        suggestion_origin = "DETERMINISTIC_REGISTRY_FACT"
        flags.append({"type":"REGISTRY_SCOPE_REPLACEMENT","status":"INSUFFICIENT_EVIDENCE",
                      "instruction":"La propuesta del modelo excedió el alcance verificable del registro. Se ofrece únicamente el hecho administrativo recuperado."})
        claim_audit = audit_citations(suggestion, evidence_manifest)
    semantic_review_status = "NOT_ASSESSED"
    if (suggestion and suggestion_origin == "MODEL_DRAFT_UNVERIFIED" and
            not any(c["status"] == "INVALID_PROVENANCE" for c in claim_audit)
            and os.getenv("VERTICE_SEMANTIC_REVIEW") == "1" and groq_key()):
        # One bounded extra call, charged to the existing user/global quota.
        for item in claim_audit:
            review_input = packet(item, evidence_manifest)
            if not review_input:
                continue
            user = await verified_user(bearer)
            if not reserve(user):
                semantic_review_status = "QUOTA_UNAVAILABLE"
                break
            judgment = await review_one(review_input, groq_key(),
                os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"), GROQ_ENDPOINT)
            item["semantic_review"] = judgment
            semantic_review_status = "MODEL_REVIEW_ONLY"
            if judgment["status"] == "MODEL_CONTRADICTION_REVIEW_REQUIRED":
                flags.append({"type":"MODEL_CONTRADICTION_REVIEW_REQUIRED","status":"INSUFFICIENT_EVIDENCE",
                              "instruction":"Una segunda evaluación detectó posible contradicción con el extracto. Revisa la cita antes de incorporar."})
            break
    # For pure research, every proposed factual sentence needs documentary
    # provenance. Merely adding a hypothesis marker does not supply evidence.
    if research_only and suggestion and any(not item.get("citations") for item in claim_audit):
        suggestion = None
        blocked = True
        flags.append({"type":"RESEARCH_UNSUPPORTED_ADDITION","status":"INSUFFICIENT_EVIDENCE",
                      "instruction":"La consulta solicitó investigación, no hipótesis nuevas. La propuesta se retiene hasta disponer de respaldo documental."})
    if any(item["status"] == "INSUFFICIENT_EVIDENCE" for item in claim_audit):
        flags.append({"type":"CLAIM_SUPPORT_UNRESOLVED","status":"INSUFFICIENT_EVIDENCE",
                      "instruction":"Revisa cada afirmación sin correspondencia documental suficiente antes de incorporarla al proyecto."})
    if any(c["status"] == "INVALID_PROVENANCE" for c in claim_audit):
        suggestion = None
        blocked = True
        flags.append({"type":"INVALID_PROVENANCE","instruction":"Una cita carece de procedencia íntegra."})
    return {
        "section": "S02", "field": req.field,
        "territory": identity,
        "territory_resolution": territorial_result["status"],
        "territory_candidates": territorial_result.get("candidates", []),
        "territory_context": req.context,
        "input_role": "RESEARCH_REQUEST" if research_only else "PARTICIPANT_TEXT_UNVERIFIED",
        "territory_conflicts": national_conflicts,
        "guidance": list(GUIDANCE[req.field]),
        "sources": docs,
        "national_records": national_records,
        "national_evidence": national_evidence,
        "evidence_manifest": evidence_manifest,
        "semantic_support_status": semantic_review_status,
        "claim_audit": claim_audit,
        "municipal_references": local_references,
        "evidence_input_status": ("LIVE_PASSAGES_AVAILABLE" if live_passages or docs
                                  else "NATIONAL_RECORDS_AVAILABLE" if national_evidence
                                  else "NO_LIVE_PASSAGES"),
        "candidate_sources": found["sources"],
        "errors": found["errors"],
        "suggestion": suggestion,
        "suggestion_origin": suggestion_origin if suggestion else None,
        "blocked_for_evidence": blocked,
        "review_flags": flags,
        "requires_approval": True,
        "claim_status": "INSUFFICIENT_EVIDENCE",
        "note": ("Se recuperaron pasajes documentales con localizador y huella. "
                 "Las afirmaciones e interpretaciones siguen sujetas a revisión humana."
                 if docs or live_passages else
                 "Registro administrativo nacional recuperado; alcance limitado y revisión humana requerida."
                 if national_evidence else
                 "Sin pasajes primarios recuperados para este campo. "
                 "Se ofrece orientación de formulación sin inventar datos.")
    }
