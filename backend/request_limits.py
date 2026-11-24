"""ASGI resource admission; process-local, no personal data retained."""
import os
import asyncio
import logging
from time import monotonic
from uuid import uuid4
from starlette.responses import JSONResponse

logger = logging.getLogger("vertice.requests")

class ResourceLimits:
    def __init__(self, app):
        self.app = app
        self.groups = {
            "export": asyncio.Semaphore(int(os.getenv("VERTICE_EXPORT_CONCURRENCY", "2"))),
            "research": asyncio.Semaphore(int(os.getenv("VERTICE_RESEARCH_CONCURRENCY", "8"))),
            "calculate": asyncio.Semaphore(4),
        }

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] != "POST":
            return await self.app(scope, receive, send)
        path = scope["path"]
        if path.startswith("/documents/"):
            group, limit = "export", 2 * 1024 * 1024
        elif path.startswith("/assistant/") or path == "/territory/resolve":
            group, limit = "research", 64 * 1024
        elif path == "/vester/calculate":
            group, limit = "calculate", 512 * 1024
        else:
            return await self.app(scope, receive, send)
        async def reject(status, message):
            headers = {"Retry-After": "5"} if status == 429 else {}
            await JSONResponse({"detail": message}, status_code=status, headers=headers)(scope, receive, send)
        headers = dict(scope.get("headers", []))
        try:
            length = int(headers.get(b"content-length", b"0"))
        except ValueError:
            return await reject(400, "Longitud inválida.")
        if length < 0 or length > limit:
            return await reject(413, "Solicitud demasiado extensa.")
        semaphore = self.groups[group]
        # Admission without an unbounded waiting queue.
        if semaphore.locked():
            return await reject(429, "Capacidad temporalmente ocupada. Intenta nuevamente.")
        async with semaphore:
            body = bytearray()
            try:
                async with asyncio.timeout(15):
                    while True:
                        message = await receive()
                        if message["type"] == "http.disconnect":
                            return
                        body.extend(message.get("body", b""))
                        if len(body) > limit:
                            return await reject(413, "Solicitud demasiado extensa.")
                        if not message.get("more_body", False):
                            break
            except TimeoutError:
                return await reject(408, "Tiempo de recepción agotado.")
            delivered = False
            async def replay():
                nonlocal delivered
                if not delivered:
                    delivered = True
                    return {"type": "http.request", "body": bytes(body), "more_body": False}
                return await receive()
            start = monotonic()
            request_id = uuid4().hex
            status = 500
            async def observe(message):
                nonlocal status
                if message["type"] == "http.response.start":
                    status = message["status"]
                await send(message)
            try:
                await self.app(scope, replay, observe)
            finally:
                logger.info("request_id=%s group=%s status=%s duration_ms=%d", request_id, group, status, (monotonic()-start)*1000)
