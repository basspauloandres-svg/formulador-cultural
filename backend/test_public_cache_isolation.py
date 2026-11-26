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


def test_real_loopback_http_pdf_deduplicated_for_40_callers(monkeypatch):
    """Actual TCP/HTTP and PDF parsing; only destination is the local test server."""
    import httpx
    from io import BytesIO
    from hashlib import sha256
    from reportlab.pdfgen import canvas

    async def run():
        buf=BytesIO()
        pdf=canvas.Canvas(buf)
        pdf.drawString(45,740,"Neira: programa de talleres de musica para estudiantes.")
        pdf.showPage()
        pdf.save()
        content=buf.getvalue()
        downloads=0
        async def serve(reader,writer):
            nonlocal downloads
            try:
                await asyncio.wait_for(reader.readuntil(b"\r\n\r\n"),2)
                downloads += 1
                await asyncio.sleep(.03)
                writer.write(b"HTTP/1.1 200 OK\r\nContent-Type: application/pdf\r\nConnection: close\r\nContent-Length: "+str(len(content)).encode()+b"\r\n\r\n"+content)
                await writer.drain()
            finally:
                writer.close()
                await writer.wait_closed()
        server=await asyncio.start_server(serve,"127.0.0.1",0)
        port=server.sockets[0].getsockname()[1]
        real_client=httpx.AsyncClient
        class LoopbackTransport(httpx.AsyncHTTPTransport):
            async def handle_async_request(self,request):
                request.url=request.url.copy_with(scheme="http",host="127.0.0.1",port=port)
                return await super().handle_async_request(request)
        def local_client(*args,**kwargs):
            return real_client(*args,transport=LoopbackTransport(),trust_env=False,**kwargs)
        monkeypatch.setattr(aa.httpx,"AsyncClient",local_client)
        monkeypatch.setattr(aa,"_PUBLIC_DOC_CACHE",aa.OrderedDict())
        monkeypatch.setattr(aa,"_PUBLIC_DOC_INFLIGHT",{})
        monkeypatch.setattr(aa,"_PUBLIC_DOC_LOCK",asyncio.Lock())
        monkeypatch.setattr(aa,"_PUBLIC_DOC_DOWNLOADS",asyncio.Semaphore(4))
        monkeypatch.setattr(aa,"_PUBLIC_DOC_STATS",dict.fromkeys(
            ("hits","misses","joined","downloads","failures","evictions"),0))
        try:
            base={"url":URL,"municipality":"Neira"}
            results=await asyncio.wait_for(asyncio.gather(*[
                aa.fetch_document({**base,"caller":i},"antecedentes")
                for i in range(40)]),10)
            assert downloads==1
            assert all(r and r["document_sha256"]==sha256(content).hexdigest() for r in results)
            assert all(r["passages"][0]["page"]==1 for r in results)
            assert [r["caller"] for r in results]==list(range(40))
            assert aa.public_document_cache_stats()["joined"]==39
            assert aa.public_document_cache_stats()["inflight"]==0
        finally:
            server.close()
            await server.wait_closed()
    asyncio.run(run())
