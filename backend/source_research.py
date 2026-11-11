"""Descubrimiento controlado de fuentes para S02. Metadatos ≠ hechos verificados."""
from __future__ import annotations
import os
import re
import httpx
from fastapi import HTTPException
from pydantic import BaseModel, Field
from assistant_pilot import verified_user, reserve

CATALOG_URL = "https://api.us.socrata.com/api/catalog/v1"
BRAVE_URL = "https://api.search.brave.com/res/v1/web/search"
ALLOWED_FIELDS = {"territorio_o_lugar_de_intervencion", "caracteristicas_culturales",
                  "principales_dinamicas_sociales", "antecedentes"}


class ResearchRequest(BaseModel):
    section: str = "S02"
    field: str = Field(max_length=100)
    text: str = Field(min_length=10, max_length=1800)
    context: str = Field(default="", max_length=200)
    include_web: bool = True


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
    return (location + " " + topic)[:100]


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
            "publisher": str(item.get("profile", {}).get("name") or "Sitio web")[:100],
            "type": "web_descubrimiento",
            "evidence_status": "INSUFFICIENT_EVIDENCE",
            "locator": "Resultado de búsqueda; comprobar documento primario y pasaje antes de citar",
            "summary": str(item.get("description") or "")[:250],
        })
    return results


async def research(req: ResearchRequest, authorization: str) -> dict:
    if req.section != "S02" or req.field not in ALLOWED_FIELDS:
        raise HTTPException(422, "La investigación documental se encuentra limitada a S02.")
    user_id = await verified_user(authorization)
    if not reserve(user_id):
        raise HTTPException(429, "Límite de consultas alcanzado. Intenta más tarde.")
    query = search_terms(req)
    findings, errors = [], []
    async with httpx.AsyncClient(timeout=12, follow_redirects=False) as client:
        try:
            response = await client.get(CATALOG_URL, params={"domains": "datos.gov.co", "q": query, "limit": 6},
                                        headers={"User-Agent": "VerticeAcademicResearch/0.1"})
            response.raise_for_status()
            findings += normalize_catalog(response.json())
        except (httpx.HTTPError, ValueError, TypeError, KeyError):
            errors.append("El catálogo público no respondió.")
        key = os.environ.get("BRAVE_SEARCH_API_KEY", "").strip()
        if req.include_web and key:
            try:
                response = await client.get(BRAVE_URL, params={"q": query, "count": 5, "country": "co", "search_lang": "es"},
                                            headers={"X-Subscription-Token": key, "Accept": "application/json"})
                response.raise_for_status()
                findings += normalize_brave(response.json())
            except (httpx.HTTPError, ValueError, TypeError, KeyError):
                errors.append("La búsqueda web ampliada no respondió.")
    # No se envía el texto del proyecto a motores de búsqueda y nunca se genera una cita falsa.
    return {
        "section": "S02", "query": query,
        "sources": findings, "verified_claims": [],
        "evidence_status": "INSUFFICIENT_EVIDENCE",
        "web_enabled": bool(os.environ.get("BRAVE_SEARCH_API_KEY", "").strip()),
        "web_requested": req.include_web, "errors": errors,
        "note": "Fuentes candidatas, no afirmaciones verificadas. Revisa contenido, fecha, alcance y pasaje original antes de incorporar datos."
    }
