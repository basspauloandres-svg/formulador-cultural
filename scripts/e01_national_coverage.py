"""Live read-only coverage audit; counts are source records, not active organizations."""
import asyncio
import json
import re
from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256

import httpx
from territory_registry import fetch_registry, resolve_from_records
from national_sources import cultural_registry, URL

async def main():
    registry = await fetch_registry()
    codes = {r["divipola"]: r for r in registry}
    for code in codes:
        result = resolve_from_records(code, registry)
        assert result["status"] == "FOUND" and result["identity"]["divipola"] == code
    print(f"E01 all territorial identities resolved: {len(codes)}")
    query = {"$select": "divipola,count(*) as record_count",
             "$group": "divipola", "$order": "divipola", "$limit": 5000}
    async with httpx.AsyncClient(timeout=40, follow_redirects=False) as client:
        response = await client.get(URL, params=query)
        response.raise_for_status()
    rows = response.json()
    assert isinstance(rows, list) and 0 < len(rows) < 5000
    counts = Counter()
    unknown = 0
    for row in rows:
        count = int(row["record_count"])
        assert count > 0
        raw = str(row.get("divipola") or "")
        code = raw.zfill(5) if re.fullmatch(r"[0-9]{1,5}", raw) else ""
        if code in codes:
            counts[code] += count
        else:
            unknown += count
    by_type = {}
    by_department = {}
    for code, identity in codes.items():
        for grouping, label in ((by_type, identity["territory_type"]),
                                (by_department, identity["department_code"])):
            bucket = grouping.setdefault(label, {"universe": 0, "with_records": 0,
                                                  "without_records": 0})
            bucket["universe"] += 1
            bucket["with_records" if counts[code] else "without_records"] += 1
    print(json.dumps({"dataset": "eenq-ga7s", "retrieved_at": datetime.now(timezone.utc).isoformat(),
                      "response_sha256": sha256(response.content).hexdigest(),
                      "query": query, "universe": len(codes), "with_records": len(counts),
                      "without_records": len(codes)-len(counts),
                      "records_unmatched": unknown, "by_type": by_type,
                      "by_department": by_department}, ensure_ascii=False, sort_keys=True))
    assert counts, "No national records matched"
    # Select a known positive from each of up to five departments deterministically.
    selected = {}
    for code in sorted(counts):
        selected.setdefault(code[:2], code)
    for code in list(selected.values())[:5]:
        result = await cultural_registry(code)
        print(f"E01 national live {code}: {result['status']}")
        assert result["status"] == "RECORDS_RETRIEVED"
        assert result["records"] and result["response_sha256"]
    print("E01 national coverage audit: PASS")

if __name__ == "__main__":
    asyncio.run(main())
