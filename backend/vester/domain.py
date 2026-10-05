from __future__ import annotations
from dataclasses import dataclass
from typing import Iterable

VALID_SCORES = (0, 1, 2, 3)

@dataclass(frozen=True)
class VesterProblem:
    id: str
    text: str

    def __post_init__(self) -> None:
        if not self.id.strip() or not self.text.strip():
            raise ValueError("Cada problema Vester requiere id y texto")

@dataclass(frozen=True)
class VesterRelation:
    source_id: str
    target_id: str
    score: int
    justification: str | None = None

    def __post_init__(self) -> None:
        if self.source_id == self.target_id:
            raise ValueError("Vester no compara un problema consigo mismo")
        if self.score not in VALID_SCORES:
            raise ValueError("La escala Vester válida es 0–3")

@dataclass(frozen=True)
class VesterPosition:
    problem_id: str
    influence: int
    dependence: int
    quadrant: str

@dataclass(frozen=True)
class VesterResults:
    positions: tuple[VesterPosition, ...]
    influence_cut: float
    dependence_cut: float


def calculate_results(
    problems: Iterable[VesterProblem],
    relations: Iterable[VesterRelation],
) -> VesterResults:
    """Cálculo determinístico. No infiere causalidad ni asigna puntuaciones."""
    problem_list = list(problems)
    ids = {p.id for p in problem_list}
    totals = {p.id: {"influence": 0, "dependence": 0} for p in problem_list}

    seen: set[tuple[str, str]] = set()
    for relation in relations:
        if relation.source_id not in ids or relation.target_id not in ids:
            raise ValueError("La relación contiene un problema que no pertenece a la matriz")
        key = (relation.source_id, relation.target_id)
        if key in seen:
            raise ValueError("Cada relación dirigida solo puede registrarse una vez")
        seen.add(key)
        totals[relation.source_id]["influence"] += relation.score
        totals[relation.target_id]["dependence"] += relation.score

    required = {(a.id, b.id) for a in problem_list for b in problem_list if a.id != b.id}
    if seen != required:
        missing = len(required - seen)
        raise ValueError(f"La matriz está incompleta: faltan {missing} relaciones dirigidas")

    n = len(problem_list)
    influence_cut = sum(v["influence"] for v in totals.values()) / n if n else 0.0
    dependence_cut = sum(v["dependence"] for v in totals.values()) / n if n else 0.0

    positions: list[VesterPosition] = []
    for p in problem_list:
        influence = totals[p.id]["influence"]
        dependence = totals[p.id]["dependence"]
        high_i = influence >= influence_cut
        high_d = dependence >= dependence_cut
        quadrant = (
            "critical" if high_i and high_d else
            "active" if high_i and not high_d else
            "passive" if not high_i and high_d else
            "indifferent"
        )
        positions.append(VesterPosition(p.id, influence, dependence, quadrant))

    return VesterResults(tuple(positions), influence_cut, dependence_cut)
