from __future__ import annotations
from dataclasses import dataclass
import re

POR_VERIFICAR = "[POR VERIFICAR]"

SOLUTION_PATTERNS = (
    r"\brequiere\b",
    r"\bnecesita\b",
    r"\bdebe\b",
    r"\bdebería\b",
    r"\bimplementar\b",
    r"\bcrear\b",
    r"\bofrecer\b",
    r"\brealizar\b",
    r"\bdesarrollar\b",
    r"\bfortalecer\b",
    r"\bcapacitar\b",
    r"\btaller(?:es)?\b",
    r"\bprograma\b",
    r"\bproyecto\b",
    r"\bestrategia\b",
)

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


def looks_like_solution(text: str) -> bool:
    clean = text.strip().lower()
    if clean.startswith(("falta de ", "ausencia de ", "carencia de ")):
        return True
    return any(re.search(pattern, clean) for pattern in SOLUTION_PATTERNS)


def basic_review(text: str, inputs: SynthesisInputs) -> SynthesisReview:
    notes: list[str] = []
    clean = text.strip()
    if not clean:
        notes.append("Falta una formulación para revisar.")
    if clean and looks_like_solution(clean):
        notes.append("La formulación parece expresar una necesidad, acción o solución. Revise cuál es la situación negativa observable que existe antes de esa respuesta.")
    if len(clean) > 220:
        notes.append("La formulación es extensa; revise si contiene más de una situación principal.")
    if not inputs.population:
        notes.append("La población permanece [POR VERIFICAR].")
    if not inputs.territory:
        notes.append("El territorio permanece [POR VERIFICAR].")
    if not inputs.evidence:
        notes.append("La formulación aún no tiene evidencia trazable asociada en S04.")
    return SynthesisReview(tuple(notes))
