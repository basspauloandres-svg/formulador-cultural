"""I01 synthetic cache checks, with no upstream traffic or private records."""
import asyncio
import pytest
import automatic_assistant as aa

URL = "https://mng.mincultura.gov.co/prensa/noticias/Documents/Fomento/FichaTerritorial_17486_2016_SIFO.pdf"

def test_public_cache_concurrency_isolation_and_retry(monkeypatch):
    async def run():
        monkeypatch.setattr(aa, "_PUBLIC_DOC_CACHE", aa.OrderedDict())
        monkeypatch.setattr(aa, "_PUBLIC_DOC_INFLIGHT", {})
        monkeypatch.setattr(aa, "_PUBLIC_DOC_LOCK", asyncio.Lock())
        monkeypatch.setattr(aa, "_PUBLIC_DOC_DOWNLOADS", asyncio.Semaphore(4))
        monkeypatch.setattr(aa, "_PUBLIC_DOC_STATS", dict.fromkeys(
            ("hits","misses","joined","downloads","failures","evictions"), 0))
        calls = []
        async def fetch(record, field):
            calls.append((record.copy(), field))
            await asyncio.sleep(.02)
            if record["municipality"] == "Sin fuente":
                return None
            return {**record, "document_sha256": "synthetic",
                    "passages": [{"page": 1, "excerpt": "Texto público"}],
                    "status": "PASSAGES_EXTRACTED_CLAIMS_UNVERIFIED"}
        monkeypatch.setattr(aa, "_fetch_document", fetch)
        base = {"url": URL, "municipality": "Neira"}
        results = await asyncio.gather(*[aa.fetch_document(
            {**base, "private_marker": str(i)}, "antecedentes") for i in range(40)])
        assert len(calls) == 1
        assert calls[0][0] == base
        assert [r["private_marker"] for r in results] == [str(i) for i in range(40)]
        results[0]["passages"][0]["excerpt"] = "modified"
        assert results[1]["passages"][0]["excerpt"] == "Texto público"
        again = await aa.fetch_document(base, "antecedentes")
        assert again["passages"][0]["excerpt"] == "Texto público"
        assert "private_marker" not in again
        assert aa.public_document_cache_stats()["joined"] == 39
        assert aa.public_document_cache_stats()["hits"] == 1
        await aa.fetch_document(base, "caracteristicas_culturales")
        assert len(calls) == 2
        await aa.fetch_document({**base,"municipality":"Otro"}, "antecedentes")
        assert len(calls) == 3
        for _ in range(2):
            assert await aa.fetch_document({**base,"municipality":"Sin fuente"}, "antecedentes") is None
        assert len(calls) == 5
        assert aa.public_document_cache_stats()["failures"] == 2
        assert aa.public_document_cache_stats()["inflight"] == 0
        monkeypatch.setattr(aa, "_PUBLIC_DOC_TTL", -1)
        await aa.fetch_document(base, "antecedentes")
        assert len(calls) == 6
    asyncio.run(run())
