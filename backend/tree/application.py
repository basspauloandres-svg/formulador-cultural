from __future__ import annotations
from dataclasses import replace
from .domain import NodeKind, TreeNode, validate_tree


def move_node(nodes: list[TreeNode], node_id: str, new_kind: NodeKind, parent_id: str | None = None) -> list[TreeNode]:
    """Mueve un nodo por decisión explícita del usuario. No infiere clasificaciones."""
    result: list[TreeNode] = []
    for node in nodes:
        if node.id == node_id:
            result.append(replace(node, kind=new_kind, parent_id=parent_id))
        elif new_kind == NodeKind.CENTRAL and node.kind == NodeKind.CENTRAL:
            result.append(replace(node, kind=NodeKind.OUTSIDE, parent_id=None))
        else:
            result.append(node)
    return result


def update_justification(nodes: list[TreeNode], node_id: str, justification: str | None) -> list[TreeNode]:
    return [replace(n, justification=justification) if n.id == node_id else n for n in nodes]


def validate_structure(nodes: list[TreeNode]):
    return validate_tree(nodes)


def objective_mapping(nodes: list[TreeNode]) -> dict[str, list[str] | str | None]:
    """Solo expone la correspondencia metodológica; no redacta objetivos ni introduce soluciones."""
    central = next((n.text for n in nodes if n.kind == NodeKind.CENTRAL), None)
    causes = [n.text for n in nodes if n.kind in (NodeKind.DIRECT_CAUSE, NodeKind.INDIRECT_CAUSE)]
    effects = [n.text for n in nodes if n.kind in (NodeKind.DIRECT_EFFECT, NodeKind.INDIRECT_EFFECT)]
    return {"problem_central": central, "causes": causes, "effects": effects}
