"""VWE pilot: paired cold/warm recovery; no model or account data."""
import asyncio
import json
import os
import sys
from time import monotonic
from unittest.mock import AsyncMock, patch
sys.path.insert(0, os.path.dirname(__file__))
import institutional_sources as s

def test_vwe_parallel_seed_retrieval_and_scope():
    html = b'<meta property="article:published_time" content="2024-04-20"><p>En Tumaco se realizaron actividades de formacion musical con estudiantes de establecimientos educativos.</p>'
    async def run():
        with patch.object(s, "public_html", new=AsyncMock(side_effect=lambda url, article=True: html if article else None)) as fetch:
            rows = await s.institutional_passages(("tumaco","narino"), {"PRACTICAS_MUSICALES"})
            assert len(rows) == 2
            assert len({r["url"] for r in rows}) == 2
            assert all(r["sha256"] and r["locator"] and r["publication_date"] == "2024-04-20" for r in rows)
            assert fetch.await_count == 5
            assert not await s.institutional_passages(("tumaco","narino"), {"GASTRONOMIA"})
    asyncio.run(run())

def test_vwe_rejects_unapproved_destinations_and_unrelated_passages():
    assert not s.safe_url("https://127.0.0.1/noticias/example")
    assert not s.safe_url("https://narino.gov.co/noticias/example?redirect=bad")
    assert not s.safe_url("https://narino.gov.co.evil.invalid/noticias/example")
    assert not s.article_passages(b'<p>En Tumaco existe una banda musical.</p>',"https://narino.gov.co/noticias/example","test","tumaco","narino")
    assert not s.article_passages(b'<meta property="article:published_time" content="2024-04-20"><p>En Pasto existe una banda musical con estudiantes.</p>',"https://narino.gov.co/noticias/example","test","tumaco","narino")

async def benchmark():
    key=("tumaco","narino")
    categories={"PRACTICAS_MUSICALES"}
    s.CACHE.clear()
    original=s._download
    async def run():
        start=monotonic()
        rows=await s.institutional_passages(key,categories)
        return {"elapsed_ms":round((monotonic()-start)*1000,2),"passages":len(rows),
                "sources":[{"url":r["url"],"locator":r["locator"],"sha256":r["sha256"],"publication_date":r["publication_date"],"excerpt":r["excerpt"]} for r in rows]}
    with patch.object(s,"_download",new=AsyncMock(wraps=original)) as downloads:
        cold=await run()
        cold["downloads"]=downloads.await_count
        downloads.reset_mock()
        warm=await run()
        warm["downloads"]=downloads.await_count
    result={"cold":cold,"warm":warm,"model_calls":0,"known_seed_control":True,
            "status":"PASSAGES_RECOVERED" if cold["passages"] else "INSUFFICIENT_EVIDENCE"}
    print("VWE_LIVE_BENCHMARK "+json.dumps(result,ensure_ascii=False))
    # A negative real-network result must be reported, not silently accepted.
    if not cold["passages"]: raise SystemExit(1)

if __name__=="__main__":
    asyncio.run(benchmark())
