"""40 pre-provisioned synthetic sessions against disposable local authentication.

Run only in the existing isolated runner; no production, no provider calls.
Measure real auth and ASGI admission, not hosted network capacity. No rate-limit
changes or administrative privileges. Setup throttling is a measured blocker.
"""
import asyncio
from collections import Counter
import json
import os
import secrets
from time import monotonic
from unittest.mock import patch

import httpx

N = 40
WINDOW = 8
QUESTIONS = (
    ("S12", "indicador", "DETERMINISTIC_GUIDANCE"),
    ("S13", "cronograma", "DETERMINISTIC_GUIDANCE"),
    ("S02", "fertilizantes agronomía", "ABSTAIN"),
)

async def main():
    url = os.environ.get("VERTICE_TEST_SUPABASE_URL")
    key = os.environ.get("VERTICE_TEST_SUPABASE_PUBLIC_KEY")
    if url != "http://127.0.0.1:54321" or not key or os.environ.get("VERTICE_AUTH_MODE") != "isolated":
        raise RuntimeError("I02 disposable local stack required")
    os.environ.pop("GROQ_API_KEY", None)
    os.environ.pop("VERTICE_E01_GROQ_KEY", None)
    from main import app
    from knowledge_index import KnowledgeIndex
    from model_usage import MODEL_BUDGET
    from assistant_pilot import verified_user

    tokens = []
    ids = set()
    setup_start = monotonic()
    async with httpx.AsyncClient(timeout=20, trust_env=False) as auth:
        for _ in range(N):
            email = "i02-" + secrets.token_hex(12) + "@example.com"
            password = secrets.token_urlsafe(32)
            headers = {"apikey": key}
            r = await auth.post(url + "/auth/v1/signup", headers=headers,
                                json={"email": email, "password": password})
            if r.status_code not in (200, 201):
                print("I02 SETUP_INSUFFICIENT_EVIDENCE " + json.dumps({
                    "provisioned": len(tokens), "status": r.status_code,
                    "elapsed_ms": round((monotonic()-setup_start)*1000)}))
                raise RuntimeError("Synthetic session setup blocked; do not alter auth limits")
            token = r.json().get("access_token")
            if not token:
                r = await auth.post(url + "/auth/v1/token?grant_type=password",
                                    headers=headers, json={"email": email, "password": password})
                if r.status_code != 200:
                    print("I02 SETUP_INSUFFICIENT_EVIDENCE " + json.dumps({
                        "provisioned": len(tokens), "status": r.status_code}))
                    raise RuntimeError("Synthetic login blocked; retain negative result")
                token = r.json().get("access_token")
            assert isinstance(token, str) and token
            identity = await verified_user("Bearer " + token)
            assert identity not in ids
            ids.add(identity)
            tokens.append(token)

    start = monotonic()
    before = MODEL_BUDGET.snapshot()
    attempts = []
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),
                                 base_url="http://isolated.test", timeout=20) as client:
        async def ask(i, phase):
            section, question, expected = QUESTIONS[i % len(QUESTIONS)]
            t = monotonic()
            r = await client.post("/assistant/knowledge",
                                  headers={"Authorization": "Bearer " + tokens[i]},
                                  json={"section": section, "question": question})
            attempts.append({"phase": phase, "status": r.status_code,
                             "ms": round((monotonic()-t)*1000, 2)})
            if r.status_code == 200:
                body = r.json()
                assert body["route"] == expected and body["section"] == section
                assert body["generation_used"] is False
            delay = None
            if r.status_code == 429:
                raw = r.headers.get("Retry-After", "")
                assert raw.isdigit() and 5 <= int(raw) <= 300
                delay = int(raw)
            return i, r.status_code, delay

        with patch("knowledge_assistant.load_index", return_value=KnowledgeIndex([])):
            initial = await asyncio.gather(*(ask(i, "initial") for i in range(N)))
            pending = [row for row in initial if row[1] == 429]
            failed = [row for row in initial if row[1] not in (200, 429)]
            recovered = set(i for i, status, _ in initial if status == 200)
            for attempt in range(1, 4):
                if not pending:
                    break
                delay = max(row[2] for row in pending)
                # A long upstream cooldown is a blocker, not permission to
                # shorten the server's delay or burn CI minutes indefinitely.
                if delay > 30:
                    break
                await asyncio.sleep(delay)
                batch_results = []
                for pos in range(0, len(pending), WINDOW):
                    batch_results += await asyncio.gather(*(
                        ask(row[0], "retry-"+str(attempt))
                        for row in pending[pos:pos+WINDOW]))
                recovered.update(i for i, status, _ in batch_results if status == 200)
                failed += [row for row in batch_results if row[1] not in (200, 429)]
                pending = [row for row in batch_results if row[1] == 429]
            assert MODEL_BUDGET.snapshot() == before
            summary = {
                "distinct_real_local_sessions": len(ids),
                "initial_status": dict(Counter(r[1] for r in initial)),
                "completed": len(recovered), "pending": len(pending),
                "other_failures": len(failed), "provider_calls": 0,
                "elapsed_ms": round((monotonic()-start)*1000),
                "attempts": attempts,
            }
            print("I02 REAL LOCAL AUTH LOAD " + json.dumps(summary, sort_keys=True))
            assert len(recovered) == N and not failed and not pending, "I02 load did not recover all users"
    print("I02 REAL_LOCAL_AUTH_40 PASS (not hosted load, no real projects)")

if __name__ == "__main__":
    asyncio.run(main())
