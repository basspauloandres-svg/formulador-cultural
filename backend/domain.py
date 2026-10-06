from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

POR_VERIFICAR = "[POR VERIFICAR]"

class SourceKind(str, Enum):
    INSTITUTIONAL = "institutional"
    RESEARCH = "research"
    ADMINISTRATIVE = "administrative"
    OBSERVATION = "observation"
    INTERVIEW = "interview"
    WEB = "web"
    OTHER = "other"

@dataclass
class Evidence:
    text: str
    source_kind: SourceKind
    source_ref: str | None = None
    verified: bool = False

@dataclass
class Section:
    code: str
    data: dict[str, Any] = field(default_factory=dict)

    def set_value(self, field_name: str, value: Any) -> None:
        self.data[field_name] = value if value not in (None, "") else POR_VERIFICAR

@dataclass
class Project:
    user_id: UUID
    title: str
    id: UUID = field(default_factory=uuid4)
    sections: dict[str, Section] = field(default_factory=dict)

    def __post_init__(self) -> None:
        for code in [f"S{i:02d}" for i in range(1, 17)]:
            self.sections.setdefault(code, Section(code=code))

@dataclass(frozen=True)
class VesterRelation:
    source: str
    target: str
    score: int
    justification: str | None = None

    def __post_init__(self) -> None:
        if self.source == self.target:
            raise ValueError("Vester no permite relación de una variable consigo misma")
        if self.score not in (0, 1, 2, 3):
            raise ValueError("La escala Vester válida es 0–3")

def calculate_vester(relations: list[VesterRelation]) -> dict[str, dict[str, int]]:
    """Cálculo determinístico de influencia y dependencia; no infiere causalidad."""
    variables = sorted({r.source for r in relations} | {r.target for r in relations})
    result = {v: {"influence": 0, "dependence": 0} for v in variables}
    for r in relations:
        result[r.source]["influence"] += r.score
        result[r.target]["dependence"] += r.score
    return result
