from __future__ import annotations
from dataclasses import dataclass, field
from .domain import VesterProblem, VesterRelation, VesterResults, calculate_results
from .ports import VesterAIPort

@dataclass
class VesterSession:
    problems: list[VesterProblem]
    relations: dict[tuple[str, str], VesterRelation] = field(default_factory=dict)

    def register_score(self, source_id: str, target_id: str, score: int, justification: str | None = None) -> None:
        relation = VesterRelation(source_id, target_id, score, justification)
        self.relations[(source_id, target_id)] = relation

    def modify_score(self, source_id: str, target_id: str, score: int, justification: str | None = None) -> None:
        self.register_score(source_id, target_id, score, justification)

    def progress(self) -> tuple[int, int]:
        total = len(self.problems) * max(0, len(self.problems) - 1)
        return len(self.relations), total

    def calculate(self) -> VesterResults:
        return calculate_results(self.problems, self.relations.values())

class VesterApplication:
    def __init__(self, ai: VesterAIPort | None = None):
        self.ai = ai

    def start(self, problems: list[VesterProblem]) -> VesterSession:
        if len(problems) < 2:
            raise ValueError("Se requieren al menos dos problemas para iniciar Vester")
        return VesterSession(problems=problems)

    def explain_relation(self, session: VesterSession, source_id: str, target_id: str) -> str | None:
        if self.ai is None:
            return None
        by_id = {p.id: p for p in session.problems}
        return self.ai.explain_relation(by_id[source_id], by_id[target_id])

    def review_justification(self, session: VesterSession, source_id: str, target_id: str) -> str | None:
        if self.ai is None:
            return None
        by_id = {p.id: p for p in session.problems}
        relation = session.relations[(source_id, target_id)]
        return self.ai.review_justification(relation, by_id[source_id], by_id[target_id])

    def interpret(self, session: VesterSession) -> str | None:
        if self.ai is None:
            return None
        return self.ai.interpret_results(session.calculate(), session.problems)
