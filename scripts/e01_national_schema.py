"""Read-only national dataset schema probe. No credentials or participant data."""
import asyncio
import json
import argparse
import httpx

REQUIRED = {"eenq-ga7s": {"divipola","departamento","municipio","tipo","naturaleza_juridica"},
            "gdxc-w37w": {"cod_dpto","dpto","cod_mpio","nom_mpio","tipo_municipio"}}
EXPLORATORY = ("p9n3-av9n", "cnky-uvcg")
DATASETS = tuple(REQUIRED) + EXPLORATORY

async def main(require_all=False):
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
                if dataset in REQUIRED and not REQUIRED[dataset].issubset({c["field"] for c in columns}):
                    raise ValueError("Missing operational schema fields")
                results.append({"id": dataset, "status": "SCHEMA_RETRIEVED",
                                "name": metadata.get("name"), "columns": columns,
                                "rows_updated_at": metadata.get("rowsUpdatedAt")})
            except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
                results.append({"id": dataset, "status": "INSUFFICIENT_EVIDENCE",
                                "error_type": type(exc).__name__})
    print(json.dumps(results, ensure_ascii=False, indent=2))
    unresolved = [r["id"] for r in results if r["status"] != "SCHEMA_RETRIEVED"]
    print("Unresolved exploratory sources: " + ", ".join(x for x in unresolved if x in EXPLORATORY))
    if any(x in REQUIRED for x in unresolved) or (require_all and unresolved):
        raise RuntimeError("Required national schema inspection incomplete")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--require-all", action="store_true", help="Require exploratory metadata as well as operational sources")
    asyncio.run(main(parser.parse_args().require_all))
