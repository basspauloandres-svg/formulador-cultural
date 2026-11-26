"""VKE local lexical retrieval. No model, network calls or participant storage.

Only an operator-curated manifest may be loaded. Metadata-only references,
unapproved rights and incomplete provenance are not searchable evidence.
The manifest records curator assertions; hashes alone do not prove authenticity
or semantic entailment. Never populate it from an untrusted request.
"""
from __future__ import annotations
from dataclasses import dataclass, asdict
from hashlib import sha256
import json
import re
import unicodedata
from urllib.parse import urlsplit
from prompt_boundary import contains_directive

MAX_PASSAGES = 5000
MAX_EXCERPT = 700
MAX_QUERY = 400
STOP = frozenset("que como para del las los una unos unas por con sobre cual cuales donde cuando este esta eso entre desde hasta puede quiero necesito".split())

def digest(value: str) -> str:
    return sha256(value.encode("utf-8")).hexdigest()

def terms(value: str) -> frozenset[str]:
    normalized = unicodedata.normalize("NFKD", value.casefold())
    normalized = "".join(c for c in normalized if not unicodedata.combining(c))
    return frozenset(t for t in re.findall(r"[a-z0-9]+", normalized) if len(t)>=3 and t not in STOP)

@dataclass(frozen=True)
class Passage:
    id: str
    title: str
    publisher: str
    edition: str
    url: str
    locator: str
    document_sha256: str
    excerpt_sha256: str
    excerpt: str
    topics: tuple[str, ...]
    rights_basis: str
    reviewed_by: str
    reviewed_at: str

def eligible(record: dict) -> Passage | None:
    if record.get("visibility") != "PUBLIC" or record.get("status") != "CURATOR_APPROVED":
        return None
    keys = ("id","title","publisher","edition","url","locator","document_sha256",
            "excerpt_sha256","excerpt","rights_basis","reviewed_by","reviewed_at")
    if any(not isinstance(record.get(k), str) or not record[k].strip() for k in keys):
        return None
    if any(len(record[k]) > 1000 or contains_directive(record[k]) for k in keys):
        return None
    if len(record["excerpt"]) > MAX_EXCERPT or len(record["excerpt"]) < 25:
        return None
    if not re.fullmatch(r"[0-9a-f]{64}", record["document_sha256"]):
        return None
    if digest(record["excerpt"]) != record["excerpt_sha256"]:
        return None
    try:
        url = urlsplit(record["url"])
        if url.scheme != "https" or not url.hostname or url.username or url.password or url.port not in (None,443):
            return None
    except ValueError:
        return None
    # URL is provenance only; this module never opens it.
    topics = record.get("topics", [])
    if not isinstance(topics,list) or len(topics)>16 or any(not isinstance(x,str) or not x.strip() or len(x)>80 or contains_directive(x) for x in topics):
        return None
    return Passage(**{k:record[k] for k in keys},topics=tuple(topics))

class KnowledgeIndex:
    def __init__(self, records: list[dict]):
        if len(records)>MAX_PASSAGES:
            raise ValueError("Corpus exceeds local bound")
        passages = [p for r in records if (p:=eligible(r)) is not None]
        ids = [p.id for p in passages]
        if len(set(ids)) != len(ids):
            raise ValueError("Duplicate approved passage IDs")
        self._passages = tuple(sorted(passages,key=lambda p:p.id))
        self.version = digest(json.dumps([asdict(p) for p in self._passages],
                             ensure_ascii=False, sort_keys=True,separators=(",",":")))
        self._terms = tuple(terms(" ".join((p.title,p.excerpt,*p.topics))) for p in self._passages)

    def retrieve(self, query: str, limit: int=3, char_budget: int=1200) -> dict:
        result = {"corpus_version":self.version, "status":"INSUFFICIENT_EVIDENCE", "passages":[]}
        if not isinstance(query,str) or len(query)>MAX_QUERY or contains_directive(query):
            return result
        q = terms(query)
        if not q:
            return result
        ranked = []
        for p, vocabulary in zip(self._passages,self._terms):
            overlap = len(q & vocabulary)
            # Conservative lexical filter, not a semantic verification score.
            if overlap >= min(2,len(q)):
                ranked.append((overlap,p))
        ranked.sort(key=lambda x:(-x[0],x[1].id))
        remaining = max(0,min(char_budget,2400))
        for _,p in ranked:
            if len(result["passages"]) >= max(0,min(limit,5)):
                break
            if len(p.excerpt)>remaining:
                continue
            result["passages"].append({**asdict(p),"passage_status":"CURATED_PASSAGE_CLAIM_UNVERIFIED"})
            remaining -= len(p.excerpt)
        if result["passages"]:
            result["status"] = "CURATED_PASSAGES_RETRIEVED"
        return result
