"""Páginas municipales accesibles y alcance de fragmentos institucionales."""
import asyncio
import os
import sys
from unittest.mock import AsyncMock, patch

sys.path.insert(0, os.path.dirname(__file__))
import municipal_sources as municipal


def test_url_whitelist_rejects_external_urls_and_redirects():
    assert municipal.safe_url("https://villamaria-caldas.gov.co/MiMunicipio/Paginas/Territorios.aspx")
    assert not municipal.safe_url("https://villamaria-caldas.gov.co.evil.org/MiMunicipio/Paginas/Territorios.aspx")
    assert not municipal.safe_url("https://villamaria-caldas.gov.co/MiMunicipio/Paginas/Territorios.aspx?redirect=evil")


def test_html_parser_preserves_complete_paragraphs():
    parser = municipal.Paragraphs()
    parser.feed("<div><p>La vereda <strong>Gallinazo</strong> presenta un corredor gastronómico en el territorio municipal.</p>"
                "<script><p>Texto irrelevante.</p></script>"
                "<p>La cabecera municipal de Villamaría se encuentra en Caldas.</p></div>")
    assert len(parser.blocks) == 2
    assert "Gallinazo presenta" in parser.blocks[0]
    assert "irrelevante" not in " ".join(parser.blocks)


def test_scope_is_limited_to_official_villamaria_and_topic():
    calls = []
    async def mock_extract(record, category):
        calls.append((record["id"], category))
        return [{"passage_status":"EXCERPT_FOUND_CLAIM_UNVERIFIED",
                 "scope_warning":"Describe específicamente la vereda Gallinazo."}]
    with patch.object(municipal,"extract_page",new=mock_extract):
        data=asyncio.run(municipal.municipal_passages(
            ("villamaria","caldas"), {"GASTRONOMIA"}))
    assert len(data)==1
    assert calls==[("VILLAMARIA-ALCALDIA-TERRITORIOS","GASTRONOMIA")]
    assert asyncio.run(municipal.municipal_passages(("neira","caldas"), {"GASTRONOMIA"}))==[]
