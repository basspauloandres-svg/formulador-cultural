"""Catálogo nacional DIVIPOLA con trazabilidad, ambigüedad y fallo seguro.

Origen DANE vía Portal Nacional de Datos Abiertos, recurso gdxc-w37w:
corte administrativo declarado 2024-12-30; datos actualizados 2025-01-24.
La consulta recupera todas las filas (municipios, isla y áreas no
municipalizadas) y conserva sus tipos. No hay inferencias demográficas.
"""
from __future__ import annotations

import asyncio
import re
import time
import unicodedata
from typing import Any

import httpx

SOURCE_PAGE = "https://www.datos.gov.co/Mapas-Nacionales/DIVIPOLA-C-digos-municipios/gdxc-w37w"
SOURCE_API = "https://www.datos.gov.co/resource/gdxc-w37w.json"
DATASET = "gdxc-w37w"
SOURCE_CUTOFF = "2024-12-30"
SOURCE_DATA_UPDATED = "2025-01-24"
CACHE_TTL_SECONDS = 24 * 60 * 60
MIN_ROWS = 1122
MAX_ROWS = 1300
_REGISTRY: list[dict] | None = None
_REFRESHED_AT: float = 0.0
_LOCK = asyncio.Lock()


def normalized(value: str) -> str:
    value = unicodedata.normalize("NFKD", str(value).casefold())
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = re.sub(r"[^a-z0-9]+", " ", value).strip()
    return re.sub(r"\s+", " ", value)


def clean_label(value: object, limit: int = 100) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()[:limit]


def parse_row(row: dict) -> dict | None:
    if not isinstance(row, dict):
        return None
    dept_code = clean_label(row.get("cod_dpto"))
    code = clean_label(row.get("cod_mpio"))
    dept = clean_label(row.get("dpto"))
    municipality = clean_label(row.get("nom_mpio"))
    category = clean_label(row.get("tipo_municipio")) or "NO_ESPECIFICADO"
    if not (re.fullmatch(r"\d{2}", dept_code)
            and re.fullmatch(r"\d{5}", code)
            and code[:2] == dept_code
            and 1 <= len(normalized(dept)) <= 80
            and 1 <= len(normalized(municipality)) <= 80):
        return None
    return {
        "municipality": municipality,
        "department": dept,
        "divipola": code,
        "department_code": dept_code,
        "territory_type": category,
        "publisher": "DANE / Portal Nacional de Datos Abiertos",
        "url": SOURCE_PAGE,
        "dataset_id": DATASET,
        "source_cutoff": SOURCE_CUTOFF,
        "data_updated": SOURCE_DATA_UPDATED,
        "year": None,
        "status": "ADMINISTRATIVE_REGISTRY_MATCH",
    }


def parse_dataset(raw: Any) -> list[dict]:
    """La integralidad del conjunto es obligatoria: prohibido cachear fragmentos."""
    if not isinstance(raw, list) or not MIN_ROWS <= len(raw) <= MAX_ROWS:
        raise ValueError("DIVIPOLA: número de filas fuera del intervalo esperado")
    records = [parse_row(item) for item in raw]
    if any(record is None for record in records):
        raise ValueError("DIVIPOLA: entrada con esquema o código incorrecto")
    codes = [record["divipola"] for record in records]
    if len(set(codes)) != len(codes):
        raise ValueError("DIVIPOLA: códigos repetidos")
    if not {"17873", "17486", "11001"}.issubset(set(codes)):
        raise ValueError("DIVIPOLA: controles territoriales ausentes")
    return records


async def fetch_registry() -> list[dict]:
    async with httpx.AsyncClient(timeout=13, follow_redirects=False) as client:
        response = await client.get(
            SOURCE_API,
            params={"$select": "cod_dpto,dpto,cod_mpio,nom_mpio,tipo_municipio",
                    "$order": "cod_mpio", "$limit": 1500},
            headers={"Accept": "application/json", "User-Agent": "VerticeResearchAssistant/0.6"},
        )
        response.raise_for_status()
        if "json" not in response.headers.get("content-type", "").lower():
            raise ValueError("DIVIPOLA no respondió JSON")
        # Defensa ante respuestas parcialmente truncadas.
        if len(response.content) > 950_000:
            raise ValueError("DIVIPOLA: respuesta demasiado grande")
        return parse_dataset(response.json())


async def registry() -> list[dict] | None:
    """En fallos de red utiliza una caché íntegra previa, nunca datos inventados."""
    global _REGISTRY, _REFRESHED_AT
    now = time.monotonic()
    if _REGISTRY is not None and now - _REFRESHED_AT < CACHE_TTL_SECONDS:
        return _REGISTRY
    async with _LOCK:
        now = time.monotonic()
        if _REGISTRY is not None and now - _REFRESHED_AT < CACHE_TTL_SECONDS:
            return _REGISTRY
        try:
            fresh = await fetch_registry()
        except (httpx.HTTPError, ValueError, TypeError, KeyError):
            return _REGISTRY
        _REGISTRY, _REFRESHED_AT = fresh, time.monotonic()
        return _REGISTRY


def _strip_prefix(value: str) -> str:
    return re.sub(r"^(?:municipio de|municipio|distrito de|distrito)\s+", "", normalized(value))


def resolve_from_records(context: str, records: list[dict]) -> dict:
    """Match estricto de municipio + departamento; sin aceptar homónimos por azar."""
    value = _strip_prefix(context)
    if not value:
        return {"status": "MISSING_TERRITORY", "identity": None}
    options = []
    for record in records:
        municipality = _strip_prefix(record["municipality"])
        department = normalized(record["department"])
        if value == municipality or value == f"{municipality} {department}" or value == record["divipola"]:
            options.append(record)
    if len(options) == 1:
        return {"status": "FOUND", "identity": options[0]}
    if len(options) > 1:
        return {"status": "AMBIGUOUS_MUNICIPALITY", "identity": None,
                "candidates": [
                    {"municipality": r["municipality"], "department": r["department"],
                     "divipola": r["divipola"], "territory_type": r["territory_type"]}
                    for r in options[:12]]}
    return {"status": "NOT_FOUND", "identity": None}


async def resolve_territory(context: str) -> dict:
    records = await registry()
    if records is None:
        return {"status": "REGISTRY_UNAVAILABLE", "identity": None}
    result = resolve_from_records(context, records)
    result["source"] = SOURCE_PAGE
    result["dataset_id"] = DATASET
    return result


def explicit_conflicts(text: str, current_code: str, records: list[dict]) -> list[dict]:
    """Only explicit municipality/department pairs or labelled DIVIPOLA codes.
    Bare names can be ambiguous or ordinary words; a mention is not a factual error.
    """
    value = normalized(text)
    found = []
    for record in records:
        if record["divipola"] == current_code:
            continue
        pair = _strip_prefix(record["municipality"]) + " " + normalized(record["department"])
        code = record["divipola"]
        if re.search(r"\b" + re.escape(pair) + r"\b", value) or re.search(r"\b(?:divipola|codigo dane)\s+" + re.escape(code) + r"\b", value):
            found.append({k:record[k] for k in ("municipality","department","divipola")})
    return found[:12]


def cached_explicit_conflicts(text: str, current_code: str) -> list[dict]:
    # The request's resolution already obtained the national registry.
    # No secondary network call or substitution of an ambiguous identity.
    return explicit_conflicts(text, current_code, _REGISTRY or [])
