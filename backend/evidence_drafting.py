"""Borrador transversal posterior a la identificación de afirmaciones.

La salida se ofrece para aprobación, no certifica hechos. Solo se admiten
pasajes obtenidos en la solicitud; metadatos y referencias preindexadas jamás
se convierten en evidencia para Groq.
"""
from __future__ import annotations
import logging
import os
import re
import httpx
from fastapi import HTTPException
from assistant_pilot import configured, groq_key, reserve, GROQ_ENDPOINT
from generative_grounding import guard_generated_claims
from claim_audit import qualify_claims

logger = logging.getLogger("uvicorn.error")


def live_context(passages: list[dict]) -> tuple[str | None, list[dict]]:
    usable = [p for p in passages if
              p.get("passage_status") == "EXCERPT_FOUND_CLAIM_UNVERIFIED"
              and p.get("sha256") and p.get("excerpt") and p.get("locator")
              and p.get("url")]
    chosen = usable[:3]
    chunks = [
        f"[E{i}] Fuente: {p.get('publisher', '')}; {p.get('title', '')}; "
        f"localizador: {p['locator']}; url: {p['url']}; Extracto: {p['excerpt']}"
        for i, p in enumerate(chosen, 1)
    ]
    return ("\n".join(chunks)[:1250] or None), chosen


async def compose_section_draft(*, section: str, field: str, text: str,
                                territory: str, claims: list[dict],
                                passages: list[dict], user_id: str) -> dict:
    """Genera y controla una propuesta; tolera falta de proveedor o cuota."""
    evidence, used = live_context(passages)
    if not configured():
        return {"suggestion": None, "draft_status": "MODEL_NOT_CONFIGURED",
                "review_flags": [], "evidence_used": used}
    if not reserve(user_id):
        return {"suggestion": None, "draft_status": "MODEL_QUOTA_EXCEEDED",
                "review_flags": [], "evidence_used": used}
    claim_description = "\n".join(
        f"- {c['statement']} (estado: {c['evidence_status']}; clase: {c['classification']})"
        for c in claims[:10]
    )
    system = (
        "Eres el asistente de formulación cultural VÉRTICE. "
        "Entrega un párrafo redactado listo para revisión humana, sin títulos. "
        "Reescribe con claridad el texto aportado y evita inferencias nuevas. "
        "No agregues cifras, hechos locales, instituciones, poblaciones, causalidades, "
        "tradiciones, festividades, identidad cultural o impactos que no estén "
        "en el texto o en extractos documentales auténticos proporcionados. "
        "El municipio es contexto administrativo, no fuente probatoria. "
        "Trata cada afirmación del usuario como NO VERIFICADA, incluso si es plausible. "
        "Expresa relaciones causales no respaldadas como hipótesis etiquetadas "
        "[POR VERIFICAR] y evita presentarlas como hechos. "
        "Distingue objetivos futuros y actividades propuestas de hechos observados. "
        "Las referencias indexadas y títulos de documentos están excluidos. "
        "Si hay extractos, utilízalos únicamente en el alcance de su fecha y territorio; "
        "puedes citarlos con [E1], [E2], [E3] según identificadores realmente presentes. "
        "No inventes páginas ni citas. Máximo 170 palabras. No incluyas explicaciones."
    )
    message = (
        f"Sección {section}, campo {field}. Municipio declarado: {territory}.\n"
        f"Texto original: {text}\nAfirmaciones identificadas:\n{claim_description}\n"
        + (f"Extractos realmente descargados:\n{evidence}\n" if evidence else
           "Sin extractos documentales descargados. No atribuyas verificación.\n")
    )
    model = os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant")
    payload = {"model": model, "temperature": 0.1, "max_completion_tokens": 600,
               "messages": [{"role": "system", "content": system},
                            {"role": "user", "content": message[:4300]}]}
    if model.startswith("openai/gpt-oss-"):
        payload["reasoning_effort"] = "low"
        payload["include_reasoning"] = False
    try:
        async with httpx.AsyncClient(timeout=18) as client:
            response = await client.post(
                GROQ_ENDPOINT,
                headers={"Authorization": "Bearer " + groq_key(),
                         "Content-Type": "application/json"}, json=payload)
        if response.status_code != 200:
            logger.info("section_draft_upstream_status=%s", response.status_code)
            return {"suggestion": None, "draft_status": "MODEL_UNAVAILABLE",
                    "review_flags": [], "evidence_used": used}
        raw = response.json()["choices"][0]["message"].get("content", "")
        if not isinstance(raw, str) or not raw.strip():
            raise ValueError("Empty model response")
        draft, flags = guard_generated_claims(raw.strip()[:1600], text, evidence)
        draft, causal_flags = qualify_claims(draft)
        flags.extend(causal_flags)
        # Referencias no presentes, incluso en frases sin adiciones léxicas,
        # no se podrán aprobar como una supuesta fuente.
        identifiers = re.findall(r"\[E(\d+)\]", draft)
        if any(int(i) > len(used) or int(i) < 1 for i in identifiers):
            return {"suggestion": None, "draft_status": "INVALID_CITATION",
                    "review_flags": flags + [{
                        "type": "INVALID_CITATION",
                        "instruction": "El modelo inventó un identificador documental."}],
                    "evidence_used": used}
        # Un extracto sin cotejo por afirmación tampoco autoriza el paso a
        # hecho. Mientras todas las afirmaciones sigan sin corroborarse,
        # S02 debe atribuir explícitamente la información a su autor.
        if (section == "S02" and field != "territorio_o_lugar_de_intervencion"
                and claims and not any(
                    x.get("evidence_status") in ("SUPPORTED", "VERIFIED",
                                                 "ADMINISTRATIVE_REGISTRY_MATCH")
                    for x in claims)):
            draft = "Según la información preliminar aportada por el formador, " + (
                draft[:1].lower() + draft[1:] if draft else text
            )
            if "[POR VERIFICAR]" not in draft:
                draft = draft.rstrip(" .") + ". [POR VERIFICAR]"
            flags.append({
                "type": "USER_ASSERTIONS_UNVERIFIED",
                "status": "INSUFFICIENT_EVIDENCE",
                "instruction": "La información del formador no se ha corroborado con documentos primarios.",
            })
        return {"suggestion": draft[:1600], "draft_status": "EDITABLE_UNVERIFIED",
                "review_flags": flags[:10], "evidence_used": used}
    except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError) as exc:
        logger.info("section_draft_failure class=%s", type(exc).__name__)
        return {"suggestion": None, "draft_status": "MODEL_UNAVAILABLE",
                "review_flags": [], "evidence_used": used}
