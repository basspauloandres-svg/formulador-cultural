"""Read-only national structured evidence. Registry records are not current facts."""
import asyncio
import hashlib
import json
import re
from datetime import datetime, timezone

import httpx

DATASET = "eenq-ga7s"
URL = "https://www.datos.gov.co/resource/" + DATASET + ".json"
FIELDS = ("divipola", "departamento", "municipio", "tipo", "naturaleza_juridica")
MAX_ROWS = 20


async def cultural_registry(code: str) -> dict:
    if not isinstance(code, str) or not re.fullmatch(r"[0-9]{5}", code):
        raise ValueError("A verified five-digit DIVIPOLA code is required")
    query = {"$select": ",".join(FIELDS),
             "$where": "divipola in ('" + code + "','" + str(int(code)) + "')",
             "$order": "divipola,departamento,municipio,tipo,naturaleza_juridica",
             "$limit": MAX_ROWS + 1}
    result = {"dataset_id": DATASET, "url": URL, "divipola": code,
              "query": query, "records": [], "status": "INSUFFICIENT_EVIDENCE",
              "scope": "Registros del conjunto publicado; no acredita actividad vigente ni exhaustividad."}
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
            for attempt in range(3):
                try:
                    response = await client.get(URL, params=query)
                    response.raise_for_status()
                    break
                except (httpx.TimeoutException, httpx.NetworkError, httpx.HTTPStatusError) as exc:
                    transient = not isinstance(exc, httpx.HTTPStatusError) or exc.response.status_code in (429, 500, 502, 503, 504)
                    if not transient or attempt == 2:
                        raise
                    await asyncio.sleep(0.5 * (2 ** attempt))
            if len(response.content) > 500_000:
                raise ValueError("Response too large")
            rows = response.json()
        if not isinstance(rows, list) or len(rows) > MAX_ROWS + 1:
            raise ValueError("Unexpected dataset response")
        for row in rows:
            if not isinstance(row, dict) or str(row.get("divipola", "")).zfill(5) != code:
                raise ValueError("Territorial mismatch")
            if any(k not in FIELDS for k in row) or any(not isinstance(v, str) for v in row.values()):
                raise ValueError("Unexpected dataset schema")
        result["records"] = rows[:MAX_ROWS]
        result["truncated"] = len(rows) > MAX_ROWS
        result["retrieved_at"] = datetime.now(timezone.utc).isoformat()
        result["response_sha256"] = hashlib.sha256(response.content).hexdigest()
        result["status"] = "RECORDS_RETRIEVED" if rows else "NO_RECORDS_RETURNED"
    except (httpx.HTTPError, ValueError, TypeError):
        result["status"] = "SOURCE_UNAVAILABLE_OR_INVALID"
    return result
