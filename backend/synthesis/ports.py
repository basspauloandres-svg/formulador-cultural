from __future__ import annotations
from typing import Protocol
from .domain import SynthesisInputs, SynthesisReview

class SynthesisAssistantPort(Protocol):
    def propose(self, inputs: SynthesisInputs) -> tuple[str, ...]: ...
    def review(self, text: str, inputs: SynthesisInputs) -> SynthesisReview: ...
