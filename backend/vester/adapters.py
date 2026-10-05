from __future__ import annotations
from .domain import VesterProblem, VesterRelation, VesterResults

class RuleBasedVesterAssistant:
    """Fallback pedagógico. No asigna puntuaciones ni añade evidencia."""

    def explain_relation(self, source: VesterProblem, target: VesterProblem) -> str:
        return (
            f"Revisa solo la dirección desde ‘{source.text}’ hacia ‘{target.text}’. "
            "Pregunta si un cambio en el primero produciría un cambio perceptible y directo en el segundo, "
            "o si ambos únicamente coinciden o dependen de otro factor."
        )

    def review_justification(self, relation: VesterRelation, source: VesterProblem, target: VesterProblem) -> str:
        text = (relation.justification or "").strip()
        if not text:
            return "La justificación es opcional. Si falta respaldo, conserva el punto como [POR VERIFICAR]."
        lowered = text.lower()
        if any(term in lowered for term in ("al mismo tiempo", "coincide", "simultáne")):
            return "La justificación podría estar describiendo simultaneidad. Revisa si existe un mecanismo de influencia directo."
        return "La justificación puede conservarse como razonamiento del usuario. La puntuación sigue siendo una decisión metodológica humana."

    def interpret_results(self, results: VesterResults, problems: list[VesterProblem]) -> str:
        return (
            "Los resultados resumen las puntuaciones registradas y sirven como lectura orientativa. "
            "No prueban causalidad ni sustituyen la revisión metodológica antes de construir el árbol de problemas."
        )
