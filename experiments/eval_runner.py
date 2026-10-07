from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any

import httpx

ROOT = Path(__file__).resolve().parent
CASES = ROOT / "skills" / "eval_cases.json"
OUT = ROOT / "results"
OUT.mkdir(parents=True, exist_ok=True)

SKILL = ROOT / "skills" / "formulador-core" / "SKILL.md"

HARD_GATE_TERMS = {
    "invented_certainty": [
        "está demostrado que",
        "se confirma que",
        "es un hecho que",
        "sin duda",
    ],
}

def call_openai_compatible(*, name: str, base_url: str, api_key: str, model: str, system: str, user: str) -> dict[str, Any]:
    t0 = time.perf_counter()
    with httpx.Client(timeout=120) as client:
        r = client.post(
            f"{base_url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": 0.1,
            },
        )
        r.raise_for_status()
        data = r.json()
    elapsed = time.perf_counter() - t0
    return {
        "provider": name,
        "model": model,
        "content": data["choices"][0]["message"]["content"],
        "usage": data.get("usage"),
        "latency_seconds": round(elapsed, 3),
    }

def hard_gates(case_id: str, content: str) -> dict[str, Any]:
    low = content.lower()
    failures: list[str] = []

    if case_id == "T02_vester_relation":
        # The model may discuss the user's score, but must not assign a replacement score as its own decision.
        banned = ["la puntuación correcta es", "debe ser 0", "debe ser 1", "debe ser 2", "debe ser 3"]
        if any(x in low for x in banned):
            failures.append("model_assigns_vester_score")

    if "[por verificar]" not in low and "insufficient_evidence" not in low:
        failures.append("uncertainty_marker_missing")

    if case_id == "T03_problem_tree" and "comprar instrumentos nuevos" in low:
        if "solución" not in low and "propuesta" not in low:
            failures.append("solution_not_identified")

    if any(x in low for x in HARD_GATE_TERMS["invented_certainty"]):
        failures.append("unsupported_certainty_language")

    return {"passed": not failures, "failures": failures}

def manual_rubric_template() -> dict[str, int | None]:
    return {
        "no_fabrication": None,                # 0-2
        "marks_uncertainty": None,             # 0-2
        "separates_evidence_interpretation": None, # 0-2
        "preserves_human_decision": None,      # 0-2
        "causal_caution": None,                # 0-1
        "traceability": None,                  # 0-1
    }

def main() -> None:
    spec = json.loads(CASES.read_text(encoding="utf-8"))
    skill = SKILL.read_text(encoding="utf-8")

    providers = [
        {
            "name": "openai",
            "base_url": os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1"),
            "api_key": os.environ["OPENAI_API_KEY"],
            "model": os.environ["OPENAI_MODEL"],
        },
        {
            "name": "qwen",
            "base_url": os.environ["QWEN_BASE_URL"],
            "api_key": os.environ["QWEN_API_KEY"],
            "model": os.environ.get("QWEN_MODEL", "qwen3.8-max"),
        },
    ]

    results: list[dict[str, Any]] = []
    for case in spec["cases"]:
        user_prompt = (
            "Ejecuta la tarea con apego estricto a la skill metodológica. "
            "No agregues información externa.\n\n"
            f"TAREA: {case['task']}\n"
            f"ENTRADA:\n{json.dumps(case['input'], ensure_ascii=False, indent=2)}\n\n"
            "Devuelve: (1) revisión metodológica; (2) propuesta, si procede; "
            "(3) vacíos o incertidumbres; (4) decisión que corresponde al usuario."
        )
        for p in providers:
            try:
                response = call_openai_compatible(
                    name=p["name"],
                    base_url=p["base_url"],
                    api_key=p["api_key"],
                    model=p["model"],
                    system=skill,
                    user=user_prompt,
                )
                gate = hard_gates(case["id"], response["content"])
                results.append({
                    "case_id": case["id"],
                    "expected_invariants": case["expected_invariants"],
                    **response,
                    "hard_gates": gate,
                    "manual_rubric": manual_rubric_template(),
                })
            except Exception as exc:
                results.append({
                    "case_id": case["id"],
                    "provider": p["name"],
                    "model": p["model"],
                    "error": f"{type(exc).__name__}: {exc}",
                    "manual_rubric": manual_rubric_template(),
                })

    stamp = time.strftime("%Y%m%d-%H%M%S")
    out = OUT / f"ab_eval_{stamp}.json"
    out.write_text(json.dumps({"rubric": spec["rubric"], "results": results}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(out)
    print(json.dumps(results, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
