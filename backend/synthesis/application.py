from __future__ import annotations
import re
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
            return self.reformulate(inputs)
        return (self._delimit(central, inputs),)

    def reformulate(self, inputs: SynthesisInputs) -> tuple[str, ...]:
        if self.assistant is not None:
            return self.assistant.propose(inputs)
        raw = (inputs.central_problem or "").strip()
        if not raw:
            return ()
        if not looks_like_solution(raw):
            return (self._delimit(raw, inputs), raw)

        subject = ""
        core = raw
        modal = re.match(r"^(.+?)\s+(?:requiere|necesita|debe|debería)\s+(.+)$", raw, flags=re.I)
        if modal:
            subject = modal.group(1).strip()
            core = modal.group(2).strip()
        else:
            core = re.sub(r"^(falta de|ausencia de|carencia de)\s+", "", raw, flags=re.I).strip()

        parts = re.split(r"\s+para\s+", core, maxsplit=1, flags=re.I)
        intervention = parts[0].strip()
        purpose = parts[1].strip() if len(parts) > 1 else ""
        focus = purpose or intervention
        who = subject or inputs.population or "la situación analizada"

        candidates = (
            f"Dificultades observables de {who} relacionadas con {focus}",
            f"Limitaciones identificadas en {who} vinculadas con {focus}",
            f"Situación problemática de {who} asociada con {focus}",
        )
        return tuple(self._delimit(item, inputs) for item in candidates)

    @staticmethod
    def _delimit(text: str, inputs: SynthesisInputs) -> str:
        out = text.strip().rstrip(".")
        lower = out.lower()
        if inputs.population and inputs.population.lower() not in lower:
            out += f" en {inputs.population}"
            lower = out.lower()
        if inputs.territory and inputs.territory.lower() not in lower:
            out += f" en {inputs.territory}"
        return out

    def review(self, text: str, inputs: SynthesisInputs) -> SynthesisReview:
        if self.assistant is not None:
            return self.assistant.review(text, inputs)
        return basic_review(text, inputs)
