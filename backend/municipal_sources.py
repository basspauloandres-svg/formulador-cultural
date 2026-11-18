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
MAX_HTML = 1_200_000
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
        for idx, block in enumerate(parser.blocks, 1):
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
                return found[:4]
    return found
