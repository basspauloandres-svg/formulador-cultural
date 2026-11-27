"""Synthetic controls; no real network, user data or model requests."""
import asyncio
from unittest.mock import AsyncMock, patch
import institutional_sources as s

URL="https://www.mincultura.gov.co/noticias/Paginas/ejemplo-cultural.aspx"
HTML=b'<meta property="article:published_time" content="2026-10-10T12:00:00"><p>El municipio de Granada, Meta, realizo un encuentro de musica comunitaria.</p>'

def test_allowlist_rejects_arbitrary_web_destinations():
    assert s.safe_url(URL)
    for url in ["https://mincultura.gov.co.evil.org/noticias/Paginas/x.aspx","http://mincultura.gov.co/noticias/Paginas/x.aspx","https://mincultura.gov.co@127.0.0.1/noticias/Paginas/x.aspx","https://mincultura.gov.co/noticias/Paginas/x.aspx?url=evil","https://mincultura.gov.co/other/path.aspx"]:
        assert not s.safe_url(url)

def test_national_homonyms_and_dates():
    rows=s.article_passages(HTML,URL,"Ministerio","granada","meta")
    assert len(rows)==1 and rows[0]["publication_date"]=="2026-10-10"
    assert len(rows[0]["sha256"])==64
    assert not s.article_passages(HTML,URL,"Ministerio","granada","antioquia")
    assert not s.article_passages(HTML.split(b"><p>")[1],URL,"Ministerio","granada","meta")

def test_contact_data_not_used_as_evidence():
    html=b'<meta property="article:published_time" content="2026-10-10"><p>Granada, Meta, realizo un encuentro de musica. Contacto: 3001234567.</p>'
    assert not s.article_passages(html,URL,"Ministerio","granada","meta")

def test_national_web_candidates_retrieved_not_snippets():
    async def fake(url,article=True):
        return HTML if url==URL else None
    with patch.object(s,"public_html",new=AsyncMock(side_effect=fake)):
        rows=asyncio.run(s.institutional_passages(("granada","meta"),{"PRACTICAS_MUSICALES"},[
            {"url":URL,"title":"Granada encuentro cultural","summary":"Texto del buscador que no se incorpora."},
            {"url":"https://evil.org/x","title":"Granada cultura","summary":"texto falso"}]))
    assert len(rows)==1
    assert "Texto del buscador" not in rows[0]["excerpt"]
    assert rows[0]["passage_status"]=="EXCERPT_FOUND_CLAIM_UNVERIFIED"


def test_economic_profile_is_scoped_dated_and_retrieved():
    html = ('<meta property="article:published_time" content="2021-03-03">'
            '<h1>Municipio de Aguadas</h1>'
            '<p>La actividad económica del caso sintético incluye agricultura y ganadería.</p>').encode()
    with patch.object(s, "public_html", new=AsyncMock(return_value=html)) as fetch:
        assert not asyncio.run(s.economic_profile_passages(("aguadas", "otra"), "agricultura"))
        assert not asyncio.run(s.economic_profile_passages(("aguadas", "caldas"), "música"))
        fetch.assert_not_awaited()
        rows = asyncio.run(s.economic_profile_passages(("aguadas", "caldas"), "investiga la ganadería"))
        assert len(rows) == 1
        row = rows[0]
        assert s.safe_url(row["url"])
        assert row["publication_date"] == "2021-03-03"
        assert row["locator"] == "Párrafo HTML 1"
        assert row["passage_status"] == "EXCERPT_FOUND_CLAIM_UNVERIFIED"
        assert len(row["sha256"]) == 64
