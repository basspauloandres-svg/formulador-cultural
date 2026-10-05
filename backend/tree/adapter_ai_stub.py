from __future__ import annotations
from .domain import TreeNode


class RuleBasedTreeTutor:
    """Adaptador sin proveedor externo. Mantiene acompañamiento básico si la IA no está disponible."""

    def suggest_classification(self, node: TreeNode, context: dict) -> str:
        return (
            "Pregunta si el elemento contribuye a que ocurra el problema central, "
            "aparece después como consecuencia, describe contexto o expresa una solución. "
            "La ubicación final debe confirmarla el usuario."
        )

    def review_relation(self, node: TreeNode, context: dict) -> str:
        if not (node.justification or "").strip():
            return "La relación todavía requiere explicación o puede mantenerse como [POR VERIFICAR]."
        return "Revisa que la justificación explique una conexión concreta y no solo simultaneidad o asociación."

    def review_wording(self, text: str, context: dict) -> str:
        lowered = text.lower().strip()
        if lowered.startswith(("falta de un proyecto", "ausencia de un proyecto", "falta de una estrategia")):
            return "La redacción parece expresar una solución ausente. Revisa cuál es la condición observable existente."
        return "Comprueba que la formulación sea observable, específica y delimitada."

    def review_coherence(self, nodes: list[TreeNode], context: dict) -> str:
        return "Revisa coherencia vertical, duplicaciones, saltos lógicos y afirmaciones que necesiten evidencia adicional."
