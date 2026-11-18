"""Recuperación controlada de pasajes HTML institucionales de Villamaría.

Encontrar un pasaje no prueba automáticamente que respalde una afirmación.
"""
from __future__ import annotations
from hashlib import sha256
from html.parser import HTMLParser
import re
from urllib.parse import urlsplit
import httpx

SOURCES = {
    ("villamaria", "caldas"): (
        {
            "id": "VILLAMARIA-ALCALDIA-MUNICIPIO",
            "title": "Mi Municipio",
            "publisher": "Alcaldía de Villamaría",
            "url": "https://villamaria-caldas.gov.co/MiMunicipio/Paginas/Mi-Municipio.aspx",
            "topics": ("TERRITORIO",),
        },
        {
            "id": "VILLAMARIA-ALCALDIA-TERRITORIOS",
            "title": "Territorios y veredas",
            "publisher": "Alcaldía de Villamaría",
            "url": "https://villamaria-caldas.gov.co/MiMunicipio/Paginas/Territorios.aspx",
            "topics": ("GASTRONOMIA", "TERRITORIO"),
        },
    ),
}
ALLOWED_HOSTS = frozenset({"villamaria-caldas.gov.co", "www.villamaria-caldas.gov.co"})
MAX_HTML = 3_000_000
# Resúmenes de referencias localizadas en sitios institucionales el 18/11/2026.
# No son citas literales ni evidencias cotejadas durante esta solicitud.
# Se muestran únicamente como referencias consultables cuando no hubo descarga.
INDEXED_REFERENCES = {
    ("villamaria", "caldas"): {
        "TERRITORIO": [{
            "source_id": "VILLAMARIA-ALCALDIA-MUNICIPIO", "title": "Mi Municipio",
            "publisher": "Alcaldía de Villamaría",
            "url": "https://villamaria-caldas.gov.co/MiMunicipio/Paginas/Mi-Municipio.aspx",
            "locator": "Geografía: conexión con Manizales",
            "excerpt": "La Alcaldía describe la conexión vial entre Villamaría y Manizales.",
            "scope_warning": "Descripción territorial municipal; no demuestra efectos culturales.",
        }],
        "GASTRONOMIA": [{
            "source_id": "VILLAMARIA-ALCALDIA-TERRITORIOS", "title": "Territorios y veredas",
            "publisher": "Alcaldía de Villamaría",
            "url": "https://villamaria-caldas.gov.co/MiMunicipio/Paginas/Territorios.aspx",
            "locator": "Gallinazo: Gastronomía",
            "excerpt": "La página municipal describe actividades gastronómicas en la vereda Gallinazo.",
            "scope_warning": "Referencia a la vereda Gallinazo; no extrapolar a todo Villamaría.",
        }],
        "PRACTICAS_MUSICALES": [{
            "source_id": "VILLAMARIA-ALCALDIA-INFORME-2023", "title": "Informe de gestión municipal de 2023",
            "publisher": "Alcaldía de Villamaría",
            "url": "https://www.villamaria-caldas.gov.co/Participa/Documents/Informe%20Procuradur%C3%ADa%20Secretar%C3%ADa%20de%20Desarrollo%20Social%20a%C3%B1o%202023.pdf",
            "locator": "Apartado CULTURA: talleres y banda sinfónica, actividades retrospectivas",
            "excerpt": "El informe incluye registros de formación musical, niveles de banda sinfónica y talleres realizados en periodos anteriores.",
            "scope_warning": "Documento de 2023 con información histórica, incluida la de 2020. No acredita continuidad actual ni participación municipal general.",
        }],
    },
}

TERM_MATCH = {
    "TERRITORIO": ("manizales", "centro-sur", "ubicad", "limita"),
    "GASTRONOMIA": ("gastronom", "platos típicos", "comestibles"),
}


class Paragraphs(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.buffer = []
        self.blocks = []
        self.skip = 0
        self.visible_chunks = []

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript"):
            self.skip += 1
        if tag == "p" and not self.skip:
            self.depth += 1
            if self.depth == 1:
                self.buffer = []

    def handle_endtag(self, tag):
        if tag == "p" and self.depth:
            self.depth -= 1
            if not self.depth:
                value = " ".join("".join(self.buffer).split())
                if len(value) >= 35:
                    self.blocks.append(value[:1500])
        if tag in ("script", "style", "noscript") and self.skip:
            self.skip -= 1

    def handle_data(self, data):
        if not self.skip:
            clean = " ".join(data.split())
            if clean:
                self.visible_chunks.append(clean[:2000])
        if self.depth and not self.skip:
            self.buffer.append(data)


def safe_url(url: str) -> bool:
    try:
        p = urlsplit(url)
        return (p.scheme == "https" and p.hostname in ALLOWED_HOSTS
                and p.port in (None, 443) and not p.username and not p.password
                and not p.query and not p.fragment
                and p.path.startswith("/MiMunicipio/Paginas/") and p.path.endswith(".aspx"))
    except ValueError:
        return False


async def extract_page(source: dict, category: str) -> list[dict]:
    """Extrae párrafos localizables por índice y hash de contenido recuperado."""
    if not safe_url(source["url"]) or category not in source["topics"]:
        return []
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
            async with client.stream("GET", source["url"], headers={
                "Accept": "text/html",
                "User-Agent": "VerticeAcademicAssistant/0.4",
            }) as response:
                if response.status_code != 200 or "html" not in response.headers.get("content-type", "").lower():
                    return []
                data = bytearray()
                async for chunk in response.aiter_bytes():
                    data.extend(chunk)
                    if len(data) > MAX_HTML:
                        return []
    except httpx.HTTPError:
        return []
    try:
        html = bytes(data).decode("utf-8", errors="replace")
        parser = Paragraphs()
        parser.feed(html)
        tokens = TERM_MATCH.get(category, ())
        matched = []
        # SharePoint puede colocar contenido visible en tablas y spans, no
        # necesariamente en etiquetas <p>. Solo usar anclas temáticas estrechas.
        blocks = list(parser.blocks)
        if not blocks:
            full = " ".join(parser.visible_chunks)
            if category == "TERRITORIO":
                anchor = re.search(r".{0,160}la ciudad est[aá] unida a manizales.{0,220}", full, re.I)
                if anchor:
                    blocks = [anchor.group(0)]
            elif category == "GASTRONOMIA":
                anchor = re.search(r".{0,140}(?:la vereda gallinazo es un corredor gastron[oó]mico|gastronom[ií]a.{0,180}gallinazo).{0,220}", full, re.I)
                if anchor:
                    blocks = [anchor.group(0)]
        for idx, block in enumerate(blocks, 1):
            normalized = block.casefold()
            if not any(term in normalized for term in tokens):
                continue
            matched.append({
                "source_id": source["id"], "title": source["title"],
                "publisher": source["publisher"], "url": source["url"],
                "locator": "Párrafo HTML " + str(idx),
                "sha256": sha256(bytes(data)).hexdigest(),
                "excerpt": block[:420],
                "category": category,
                "passage_status": "EXCERPT_FOUND_CLAIM_UNVERIFIED",
                "scope_warning": ("Describe específicamente la vereda Gallinazo."
                                  if "gallinazo" in normalized else
                                  "Revisar si el pasaje se refiere a todo el municipio o a un sector."),
                "publication_year": None,
            })
            if len(matched) >= 2:
                break
        return matched
    except (ValueError, TypeError):
        return []


async def municipal_passages(key: tuple[str, str] | None, categories: set[str]) -> list[dict]:
    found = []
    if not key or key not in SOURCES:
        return found
    for source in SOURCES[key]:
        for category in sorted(categories.intersection(source["topics"])):
            found.extend(await extract_page(source, category))
            if len(found) >= 4:
                break
    # Las referencias indexadas se identifican expresamente como paráfrasis:
    # no se simula una descarga, página, hash ni corroboración automática.
    represented = {passage["category"] for passage in found}
    for category in sorted(categories - represented):
        for reference in INDEXED_REFERENCES.get(key, {}).get(category, []):
            found.append({
                **reference, "category": category, "publication_year": None,
                "indexed_on": "2026-11-18", "sha256": None,
                "passage_status": "INDEXED_INSTITUTIONAL_REFERENCE_UNVERIFIED",
            })
    return found[:6]
