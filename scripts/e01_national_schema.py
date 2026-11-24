"""Read-only national dataset schema probe. No credentials or participant data."""
import asyncio
import json
import httpx

DATASETS = ("eenq-ga7s", "p9n3-av9n", "cnky-uvcg", "gdxc-w37w")

async def main():
    results = []
    async with httpx.AsyncClient(timeout=25, follow_redirects=False) as client:
        for dataset in DATASETS:
            try:
                response = await client.get(f"https://www.datos.gov.co/api/views/{dataset}.json")
                response.raise_for_status()
                metadata = response.json()
                if metadata.get("id") != dataset:
                    raise ValueError("Dataset identifier mismatch")
                columns = [{"name": c.get("name"), "field": c.get("fieldName"),
                            "type": c.get("dataTypeName")}
                           for c in metadata["columns"]]
                if not columns:
                    raise ValueError("Empty schema")
                results.append({"id": dataset, "status": "SCHEMA_RETRIEVED",
                                "name": metadata.get("name"), "columns": columns,
                                "rows_updated_at": metadata.get("rowsUpdatedAt")})
            except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
                results.append({"id": dataset, "status": "INSUFFICIENT_EVIDENCE",
                                "error_type": type(exc).__name__})
    print(json.dumps(results, ensure_ascii=False, indent=2))
    if any(r["status"] != "SCHEMA_RETRIEVED" for r in results):
        raise RuntimeError("National schema inspection incomplete")

if __name__ == "__main__":
    asyncio.run(main())
