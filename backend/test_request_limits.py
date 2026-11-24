import asyncio
import unittest
import httpx
from fastapi import FastAPI, Request
from request_limits import ResourceLimits

class ResourceLimitsTests(unittest.IsolatedAsyncioTestCase):
    async def test_limits_and_health(self):
        app = FastAPI()
        app.add_middleware(ResourceLimits)
        @app.post("/assistant/test")
        async def echo(request: Request):
            return {"size": len(await request.body())}
        @app.get("/health")
        async def health():
            return {"status": "ok"}
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            self.assertEqual((await client.post("/assistant/test", content=b"abc")).json(), {"size": 3})
            self.assertEqual((await client.post("/assistant/test", content=b"x"*65537)).status_code, 413)
            async def chunks():
                yield b"x"*40000
                yield b"x"*40000
            self.assertEqual((await client.post("/assistant/test", content=chunks())).status_code, 413)
            self.assertEqual((await client.get("/health")).status_code, 200)

    async def test_saturation(self):
        app = FastAPI()
        entered = asyncio.Event()
        release = asyncio.Event()
        count = 0
        @app.post("/documents/pdf")
        async def export():
            nonlocal count
            count += 1
            if count == 2:
                entered.set()
            await release.wait()
            return {"ok": True}
        protected = ResourceLimits(app)
        protected.groups["export"] = asyncio.Semaphore(2)
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=protected), base_url="http://test") as client:
            tasks = [asyncio.create_task(client.post("/documents/pdf", json={})) for _ in range(2)]
            try:
                await asyncio.wait_for(entered.wait(), 3)
                response = await client.post("/documents/pdf", json={})
                self.assertEqual(response.status_code, 429)
                self.assertEqual(response.headers["Retry-After"], "5")
            finally:
                release.set()
                await asyncio.gather(*tasks)
            self.assertEqual((await client.post("/documents/pdf", json={})).status_code, 200)
