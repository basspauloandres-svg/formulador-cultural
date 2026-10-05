from __future__ import annotations
from dataclasses import dataclass

POR_VERIFICAR = "[POR VERIFICAR]"

@dataclass(frozen=True)
class SynthesisInputs:
    central_problem: str | None
    population: str | None
    territory: str | None
    evidence: tuple[str, ...] = ()
    direct_causes: tuple[str, ...] = ()
    direct_effects: tuple[str, ...] = ()

@dataclass(frozen=True)
class SynthesisReview:
    observations: tuple[str, ...]


def basic_review(text: str, inputs: SynthesisInputs) -> SynthesisReview:
    notes: list[str] = []
    clean = text.strip()
    if not clean:
        notes.append("Falta una formulación para revisar.")
    if clean.lower().startswith(("falta de ", "ausencia de ", "carencia de ")):
        notes.append("La formulación podría expresar ausencia de una solución; revise la condición negativa observable.")
    if len(clean) > 220:
        notes.append("La formulación es extensa; revise si contiene más de una situación principal.")
    if not inputs.population:
        notes.append("La población permanece [POR VERIFICAR].")
    if not inputs.territory:
        notes.append("El territorio permanece [POR VERIFICAR].")
    if not inputs.evidence:
        notes.append("La formulación aún no tiene evidencia trazable asociada en S04.")
    return SynthesisReview(tuple(notes))
