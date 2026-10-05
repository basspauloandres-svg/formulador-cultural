from __future__ import annotations
from typing import Protocol
from .domain import TreeNode


class TreeAIPort(Protocol):
    def suggest_classification(self, node: TreeNode, context: dict) -> str:
        """Sugiere una clasificación sin aplicarla automáticamente."""
        ...

    def review_relation(self, node: TreeNode, context: dict) -> str:
        """Revisa la plausibilidad y claridad de una relación sin modificar datos."""
        ...

    def review_wording(self, text: str, context: dict) -> str:
        """Explica problemas de formulación y puede ofrecer una reformulación opcional."""
        ...

    def review_coherence(self, nodes: list[TreeNode], context: dict) -> str:
        """Entrega observaciones; no emite una calificación absoluta."""
        ...
