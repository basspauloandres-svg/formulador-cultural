from .domain import NodeKind, TreeNode, validate_tree
from .application import move_node, objective_mapping


def test_requires_one_central_problem():
    nodes = [TreeNode("a", "Problema A", NodeKind.OUTSIDE)]
    issues = validate_tree(nodes)
    assert any(i.code == "missing_central" for i in issues)


def test_indirect_node_without_parent_is_flagged():
    nodes = [
        TreeNode("c", "Problema central", NodeKind.CENTRAL),
        TreeNode("d", "Causa directa", NodeKind.DIRECT_CAUSE),
        TreeNode("i", "Causa indirecta", NodeKind.INDIRECT_CAUSE),
    ]
    issues = validate_tree(nodes)
    assert any(i.code == "missing_parent" and i.node_id == "i" for i in issues)


def test_move_to_central_demotes_previous_central():
    nodes = [
        TreeNode("a", "Problema A", NodeKind.CENTRAL),
        TreeNode("b", "Problema B", NodeKind.OUTSIDE),
    ]
    moved = move_node(nodes, "b", NodeKind.CENTRAL)
    assert next(n for n in moved if n.id == "a").kind == NodeKind.OUTSIDE
    assert next(n for n in moved if n.id == "b").kind == NodeKind.CENTRAL


def test_objective_mapping_does_not_generate_objectives():
    nodes = [
        TreeNode("c", "Problema central", NodeKind.CENTRAL),
        TreeNode("a", "Causa", NodeKind.DIRECT_CAUSE),
        TreeNode("e", "Efecto", NodeKind.DIRECT_EFFECT),
    ]
    mapping = objective_mapping(nodes)
    assert mapping == {"problem_central": "Problema central", "causes": ["Causa"], "effects": ["Efecto"]}
