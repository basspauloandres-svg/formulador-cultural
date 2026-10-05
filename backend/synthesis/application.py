from __future__ import annotations
from .domain import SynthesisInputs, SynthesisReview, basic_review, looks_like_solution
from .ports import SynthesisAssistantPort

class SynthesisService:
    def __init__(self, assistant: SynthesisAssistantPort | None = None):
        self.assistant = assistant

    def propose(self, inputs: SynthesisInputs) -> tuple[str, ...]:
        if self.assistant is not None:
            return self.assistant.propose(inputs)
        central = (inputs.central_problem or "").strip()
        if not central:
            return ("[POR VERIFICAR] Define primero una situación negativa observable como problema central.",)
        if looks_like_solution(central):
            return (
                f"[POR VERIFICAR] La formulación de S07 parece expresar una necesidad o solución («{central}»). "
                "Describe la situación negativa observable que existe antes de esa respuesta.",
            )
        parts = [central]
        if inputs.population:
            parts.append(f"en {inputs.population}")
        if inputs.territory:
            parts.append(f"en {inputs.territory}")
        return (" ".join(parts),)

    def review(self, text: str, inputs: SynthesisInputs) -> SynthesisReview:
        if self.assistant is not None:
            return self.assistant.review(text, inputs)
        return basic_review(text, inputs)
