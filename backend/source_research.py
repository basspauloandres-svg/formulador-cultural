"""Descubrimiento controlado de fuentes para S02. Metadatos ≠ hechos verificados."""
from __future__ import annotations
import os
import re
from collections import defaultdict, deque, OrderedDict
from copy import deepcopy
from time import monotonic
import asyncio
from datetime import datetime, timezone
from threading import Lock
import httpx
from fastapi import HTTPException
from pydantic import BaseModel, Field
from assistant_pilot import verified_user

CATALOG_URL = "https://api.us.socrata.com/api/catalog/v1"
BRAVE_URL = "https://api.search.brave.com/res/v1/web/search"
WIKIPEDIA_URL = "https://es.wikipedia.org/w/api.php"
ALLOWED_FIELDS = {"territorio_o_lugar_de_intervencion", "caracteristicas_culturales",
                  "principales_dinamicas_sociales", "antecedentes"}
RESEARCH_WINDOW_SECONDS = 3600
RESEARCH_PER_USER_HOURLY = int(os.getenv("VERTICE_RESEARCH_USER_HOURLY", "20"))
RESEARCH_GLOBAL_HOURLY = int(os.getenv("VERTICE_RESEARCH_GLOBAL_HOURLY", "300"))
_research_times: dict[str, deque[float]] = defaultdict(deque)
_research_lock = Lock()


def reserve_research(user_id: str, now: float | None = None) -> bool:
    """Cupo propio de investigación; no consume llamadas al modelo Groq."""
    timestamp = now if now is not None else datetime.now(timezone.utc).timestamp()
    with _research_lock:
        for key in (user_id, "__research_global__"):
            queue = _research_times[key]
            while queue and timestamp - queue[0] >= RESEARCH_WINDOW_SECONDS:
                queue.popleft()
        if (len(_research_times[user_id]) >= RESEARCH_PER_USER_HOURLY
                or len(_research_times["__research_global__"]) >= RESEARCH_GLOBAL_HOURLY):
            return False
        _research_times[user_id].append(timestamp)
        _research_times["__research_global__"].append(timestamp)
        return True



class ResearchRequest(BaseModel):
    section: str = "S02"
    field: str = Field(max_length=100)
    text: str = Field(min_length=10, max_length=1800)
    context: str = Field(default="", max_length=200)
    include_web: bool = True
    question: str = Field(default='', max_length=3000)


def search_terms(request: ResearchRequest) -> str:
    # Datos mínimos: municipio, no el texto completo del proyecto.
    location = re.sub(r"[^\w\sáéíóúñÁÉÍÓÚÑ-]", " ", request.context).strip()
    location = " ".join(location.split()[:5])
    if not location:
        raise HTTPException(422, "Registra primero el municipio en S01 para buscar fuentes territoriales.")
    topic = {
        "territorio_o_lugar_de_intervencion": "municipio territorio",
        "caracteristicas_culturales": "cultura música",
        "principales_dinamicas_sociales": "población social",
        "antecedentes": "proyectos culturales"
    }[request.field]
    # Only a controlled vocabulary and years leave VÉRTICE; never send free text.
    q = normalize_metadata_text(request.question)
    controlled = ("bandas", "musica", "danza", "teatro", "bibliotecas", "patrimonio", "artesania", "educacion", "poblacion", "demografia", "juventud", "ruralidad", "empleo", "migracion", "pobreza", "plan de desarrollo", "participacion")
    extras = [word for word in controlled if re.search(r"\\b"+word+r"\\b", q)][:3]
    years = re.findall(r"\\b(?:19|20)\\d{2}\\b", q)[:2]
    return (" ".join([location, topic, *extras, *years]))[:140]



CULTURAL_TERMS = ("cultur", "music", "artist", "arte", "festival", "fiesta", "patrimonio", "teatro", "danza", "biblioteca", "museo", "artesania", "saberes")
OTHER_TERMS = {
    "territorio_o_lugar_de_intervencion": ("territor", "municip", "geograf", "vereda", "ordenamiento", "cartograf", "poblacion"),
    "principales_dinamicas_sociales": ("social", "poblacion", "comun", "convivencia", "educacion", "salud", "empleo"),
    "antecedentes": ("proyecto", "programa", "convocatoria", "cultur", "artist", "ejecucion", "informe"),
}
def normalize_metadata_text(value: str) -> str:
    """Comparación literal normalizada, no similitud semántica."""
    import unicodedata
    value = unicodedata.normalize("NFKD", str(value).casefold())
    return "".join(ch for ch in value if not unicodedata.combining(ch))


def municipality_from_context(context: str) -> str:
    """Municipio del primer componente de S01; departamento es contexto auxiliar."""
    raw = re.split(r",|;", context.strip(), maxsplit=1)[0]
    raw = re.sub(r"^(?:municipio de|municipio)\s+", "", raw, flags=re.I)
    normalized = normalize_metadata_text(raw)
    return " ".join(re.findall(r"[a-z0-9]+", normalized))


def filter_relevant(items: list[dict], field: str, context: str = "") -> tuple[list[dict], int]:
    """Filtro conservador de municipio + tema en metadatos.

    Una coincidencia temática sola nunca acredita pertinencia territorial.
    Sin municipio explícito en metadatos, el documento se retiene fuera de
    la lista; es un falso negativo aceptable antes que simular evidencia local.
    """
    terms = CULTURAL_TERMS if field == "caracteristicas_culturales" else OTHER_TERMS[field]
    municipality = municipality_from_context(context)
    selected = []
    for item in items:
        value = normalize_metadata_text(f"{item.get('title', '')} {item.get('summary', '')}")
        topic_found = any(term in value for term in terms)
        if not topic_found:
            continue
        if municipality:
            words = r"\b" + r"\s+".join(re.escape(word) for word in municipality.split()) + r"\b"
            if not re.search(words, value):
                continue
        selected.append({
            **item,
            "relevance_status": "MUNICIPAL_THEMATIC_CANDIDATE" if municipality else "THEMATIC_CANDIDATE",
            "territorial_scope_status": "MUNICIPALITY_MENTIONED_IN_METADATA" if municipality else "NOT_ASSESSED",
        })
    return selected, len(items) - len(selected)


def normalize_catalog(data: dict) -> list[dict]:
    results = []
    for entry in data.get("results", [])[:6]:
        resource = entry.get("resource") or {}
        rid = resource.get("id", "")
        link = resource.get("permalink") or (f"https://www.datos.gov.co/d/{rid}" if re.fullmatch(r"[a-z0-9]{4}-[a-z0-9]{4}", rid) else "")
        if not link.startswith("https://"):
            continue
        results.append({
            "id": "catalog-" + str(rid)[:24],
            "title": str(resource.get("name") or "Conjunto de datos")[:180],
            "url": link,
            "publisher": str((entry.get("classification") or {}).get("domain_category") or "Datos Abiertos Colombia")[:100],
            "type": "catalogo_datos",
            "evidence_status": "INSUFFICIENT_EVIDENCE",
            "locator": "Metadatos de catálogo; revisar conjunto de datos, variables, año y cobertura",
            "summary": str(resource.get("description") or "")[:250],
        })
    return results


def normalize_wikipedia(data: dict) -> list[dict]:
    results = []
    for item in (data.get("query") or {}).get("search", [])[:4]:
        pageid = item.get("pageid")
        if not isinstance(pageid, int) or pageid <= 0:
            continue
        results.append({
            "id": "wikipedia-" + str(pageid),
            "title": str(item.get("title") or "Artículo enciclopédico")[:180],
            "url": f"https://es.wikipedia.org/?curid={pageid}",
            "publisher": "Wikipedia, enciclopedia colaborativa",
            "type": "fuente_secundaria",
            "evidence_status": "INSUFFICIENT_EVIDENCE",
            "locator": "Fuente secundaria de orientación: contrastar referencias y documento primario",
            "summary": "",
        })
    return results


def normalize_brave(data: dict) -> list[dict]:
    results = []
    for index, item in enumerate((data.get("web") or {}).get("results", [])[:5]):
        url = str(item.get("url") or "")
        if not url.startswith("https://"):
            continue
        results.append({
            "id": f"web-{index+1}",
            "title": str(item.get("title") or "Resultado web")[:180],
            "url": url,
            "publisher": str((item.get("profile") or {}).get("name") or "Sitio web")[:100],
            "type": "web_descubrimiento",
            "evidence_status": "INSUFFICIENT_EVIDENCE",
            "locator": "Resultado de búsqueda; comprobar documento primario y pasaje antes de citar",
            "summary": str(item.get("description") or "")[:250],
        })
    return results


_PUBLIC_SEARCH_CACHE = OrderedDict()
_PUBLIC_SEARCH_TASKS = {}
_PUBLIC_SEARCH_LOCK = asyncio.Lock()
_PUBLIC_SEARCH_TTL = 900

async def research(req: ResearchRequest, authorization: str, *, user_id: str | None = None) -> dict:
    if req.section != "S02" or req.field not in ALLOWED_FIELDS:
        raise HTTPException(422, "La investigación documental se encuentra limitada a S02.")
    query = search_terms(req)
    trusted_context = user_id is not None
    user_id = user_id or await verified_user(authorization)
    if not reserve_research(user_id):
        raise HTTPException(429, "Límite de búsquedas documentales alcanzado. Intenta más tarde. La cuota de IA es independiente.")
    # Only the exact-code structured route provides canonical public context.
    # Do not cache private questions or results containing participant text.
    if not trusted_context:
        return await _discover(req,query)
    key=(query,req.field,req.context,req.include_web,bool(os.environ.get("BRAVE_SEARCH_API_KEY","").strip()))
    async with _PUBLIC_SEARCH_LOCK:
        cached=_PUBLIC_SEARCH_CACHE.get(key)
        if cached and monotonic()-cached[0]<_PUBLIC_SEARCH_TTL:
            _PUBLIC_SEARCH_CACHE.move_to_end(key)
            return {**deepcopy(cached[1]),"search_cache":"HIT"}
        if key in _PUBLIC_SEARCH_TASKS:
            task=_PUBLIC_SEARCH_TASKS[key]
        else:
            if len(_PUBLIC_SEARCH_TASKS)>=16:
                raise HTTPException(429,"Capacidad de búsqueda temporalmente ocupada.")
            # Pass only canonical public fields into shared work.
            public_req=ResearchRequest(field=req.field,context=req.context,text="Consulta territorial pública",include_web=req.include_web)
            task=asyncio.create_task(_cached_discovery(key,public_req,query))
            _PUBLIC_SEARCH_TASKS[key]=task
    return {**deepcopy(await asyncio.shield(task)),"search_cache":"MISS_OR_JOIN"}

async def _cached_discovery(key,req,query):
    try:
        result=await _discover(req,query)
        # Cache positive results, not errors or empty results.
        if result["sources"] and not result["errors"]:
            async with _PUBLIC_SEARCH_LOCK:
                _PUBLIC_SEARCH_CACHE[key]=(monotonic(),deepcopy(result))
                _PUBLIC_SEARCH_CACHE.move_to_end(key)
                while len(_PUBLIC_SEARCH_CACHE)>128: _PUBLIC_SEARCH_CACHE.popitem(last=False)
        return result
    finally:
        async with _PUBLIC_SEARCH_LOCK: _PUBLIC_SEARCH_TASKS.pop(key,None)

async def _discover(req,query):
    findings, errors = [], []
    async with httpx.AsyncClient(timeout=12, follow_redirects=False) as client:
        try:
            response = await client.get(CATALOG_URL, params={"domains": "datos.gov.co", "q": query, "limit": 6},
                                        headers={"User-Agent": "VerticeAcademicResearch/0.1"})
            response.raise_for_status()
            findings += normalize_catalog(response.json())
            if not findings:
                # La búsqueda temática puede ser demasiado restrictiva para catálogos territoriales.
                broad_query = " ".join(query.split()[:2])
                response = await client.get(CATALOG_URL, params={
                    "domains": "datos.gov.co", "q": broad_query, "limit": 6
                }, headers={"User-Agent": "VerticeAcademicResearch/0.1"})
                response.raise_for_status()
                findings += normalize_catalog(response.json())
        except (httpx.HTTPError, ValueError, TypeError, KeyError):
            errors.append("El catálogo público no respondió.")
        if req.include_web:
            try:
                response = await client.get(WIKIPEDIA_URL, params={
                    "action": "query", "list": "search", "format": "json",
                    "srsearch": " ".join(query.split()[:2]), "srlimit": 4,
                }, headers={"User-Agent": "VerticeAcademicResearch/0.1 (public research pilot)"})
                response.raise_for_status()
                findings += normalize_wikipedia(response.json())
            except (httpx.HTTPError, ValueError, TypeError, KeyError):
                errors.append("La consulta enciclopédica pública no respondió.")
        key = os.environ.get("BRAVE_SEARCH_API_KEY", "").strip()
        if req.include_web and key:
            try:
                response = await client.get(BRAVE_URL, params={"q": query, "count": 5, "country": "co", "search_lang": "es"},
                                            headers={"X-Subscription-Token": key, "Accept": "application/json"})
                response.raise_for_status()
                findings += normalize_brave(response.json())
            except (httpx.HTTPError, ValueError, TypeError, KeyError):
                errors.append("La búsqueda web ampliada no respondió.")
    findings, excluded = filter_relevant(findings, req.field, req.context)
    # No se envía el texto del proyecto a motores de búsqueda y nunca se genera una cita falsa.
    return {
        "section": "S02", "query": query,
        "sources": findings, "excluded_for_low_relevance": excluded, "verified_claims": [],
        "evidence_status": "INSUFFICIENT_EVIDENCE",
        "web_enabled": req.include_web,
        "web_extended_enabled": bool(os.environ.get("BRAVE_SEARCH_API_KEY", "").strip()),
        "web_requested": req.include_web, "errors": errors,
        "note": ("Candidatos cuya descripción menciona el municipio y el tema; "
                 "sin lectura, el documento no demuestra ningún hecho. "
                 "La ausencia de resultados no significa ausencia de prácticas culturales.")
    }
