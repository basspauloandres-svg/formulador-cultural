from __future__ import annotations
from dataclasses import dataclass
from enum import Enum
from typing import Iterable


class NodeKind(str, Enum):
    OUTSIDE = "outside"
    CENTRAL = "central"
    DIRECT_CAUSE = "direct_cause"
    INDIRECT_CAUSE = "indirect_cause"
    DIRECT_EFFECT = "direct_effect"
    INDIRECT_EFFECT = "indirect_effect"


@dataclass(frozen=True)
class TreeNode:
    id: str
    text: str
    kind: NodeKind
    justification: str | None = None
    parent_id: str | None = None

    def __post_init__(self) -> None:
        if not self.id.strip() or not self.text.strip():
            raise ValueError("Cada nodo requiere id y texto")
        if self.kind in (NodeKind.INDIRECT_CAUSE, NodeKind.INDIRECT_EFFECT) and self.parent_id == self.id:
            raise ValueError("Un nodo no puede depender de sí mismo")


@dataclass(frozen=True)
class TreeIssue:
    code: str
    message: str
    node_id: str | None = None


def validate_tree(nodes: Iterable[TreeNode]) -> tuple[TreeIssue, ...]:
    """Valida estructura básica sin afirmar causalidad ni reemplazar decisiones del usuario."""
    items = list(nodes)
    issues: list[TreeIssue] = []
    ids = {n.id for n in items}
    central = [n for n in items if n.kind == NodeKind.CENTRAL]
    if len(central) == 0:
        issues.append(TreeIssue("missing_central", "El árbol todavía no tiene un problema central confirmado."))
    elif len(central) > 1:
        issues.append(TreeIssue("multiple_central", "El árbol contiene más de un problema central."))

    seen_text: dict[str, str] = {}
    for node in items:
        if node.kind == NodeKind.OUTSIDE:
            continue
        key = " ".join(node.text.lower().split())
        if key in seen_text:
            issues.append(TreeIssue("duplicate", "Hay elementos duplicados dentro del árbol.", node.id))
        else:
            seen_text[key] = node.id

        if node.kind in (NodeKind.INDIRECT_CAUSE, NodeKind.INDIRECT_EFFECT):
            if not node.parent_id:
                issues.append(TreeIssue("missing_parent", "Un elemento indirecto requiere revisar su conexión con el nivel anterior.", node.id))
            elif node.parent_id not in ids:
                issues.append(TreeIssue("invalid_parent", "La relación apunta a un elemento que ya no pertenece al árbol.", node.id))

    if any(n.kind == NodeKind.INDIRECT_CAUSE for n in items) and not any(n.kind == NodeKind.DIRECT_CAUSE for n in items):
        issues.append(TreeIssue("indirect_without_direct_cause", "Hay causas indirectas sin causas directas asociadas."))
    if any(n.kind == NodeKind.INDIRECT_EFFECT for n in items) and not any(n.kind == NodeKind.DIRECT_EFFECT for n in items):
        issues.append(TreeIssue("indirect_without_direct_effect", "Hay efectos indirectos sin efectos directos asociados."))
    return tuple(issues)
