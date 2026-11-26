"""I02/V01: aggregate provider usage and bounded process-local model admission.

Reservation units are UTF-8 request bytes plus completion cap and overhead,
a conservative operational proxy, not provider tokenizer counts or billing.
No user identifiers, prompts, responses, credentials or query contents retained.
Actual tokens come only from the provider usage object; missing is not zero.
"""
from collections import deque
from threading import Lock
from time import monotonic
import json
import logging
import os

ROUTES = ("s02", "section_draft", "semantic_review")
logger = logging.getLogger("vertice.model_usage")

class ModelBudget:
    def __init__(self, cap=1_000_000, window=3600, clock=monotonic):
        self.cap, self.window, self.clock = cap, window, clock
        self.lock = Lock()
        self.reservations = deque()
        self.reserved = 0
        self.counters = {r: dict(admitted=0, rejected=0, reported=0, missing_usage=0,
                                 prompt_tokens=0, completion_tokens=0,
                                 cached_prompt_tokens=0, reported_cache=0)
                         for r in ROUTES}

    def reserve(self, route, payload):
        if route not in ROUTES:
            raise ValueError("Unknown route")
        completion = payload.get("max_completion_tokens")
        if type(completion) is not int or not 1 <= completion <= 4096:
            raise ValueError("Invalid completion bound")
        units = len(json.dumps(payload, ensure_ascii=False).encode("utf-8")) + completion + 64
        with self.lock:
            now = self.clock()
            while self.reservations and now-self.reservations[0][0] >= self.window:
                self.reserved -= self.reservations.popleft()[1]
            if self.reserved+units > self.cap:
                self.counters[route]["rejected"] += 1
                return False
            self.reservations.append((now,units))
            self.reserved += units
            self.counters[route]["admitted"] += 1
            return True

    def observe(self, route, data):
        usage = data.get("usage") if isinstance(data,dict) else None
        def valid(v):
            return type(v) is int and 0 <= v <= 10_000_000
        with self.lock:
            c = self.counters[route]
            if not isinstance(usage,dict) or not all(valid(usage.get(k)) for k in ("prompt_tokens","completion_tokens")):
                c["missing_usage"] += 1
                logger.info("model_usage route=%s status=missing",route)
                return
            p, o = usage["prompt_tokens"], usage["completion_tokens"]
            c["reported"] += 1
            c["prompt_tokens"] += p
            c["completion_tokens"] += o
            details = usage.get("prompt_tokens_details")
            cached = details.get("cached_tokens") if isinstance(details,dict) else None
            if valid(cached) and cached <= p:
                c["reported_cache"] += 1
                c["cached_prompt_tokens"] += cached
            logger.info("model_usage route=%s prompt_tokens=%d completion_tokens=%d cached_prompt_tokens=%s",
                        route,p,o,str(cached) if valid(cached) and cached<=p else "unknown")

    def snapshot(self):
        with self.lock:
            return {r:dict(v) for r,v in self.counters.items()}

MODEL_BUDGET = ModelBudget(cap=int(os.getenv("VERTICE_MODEL_RESERVED_UNITS_HOURLY","1000000")))
