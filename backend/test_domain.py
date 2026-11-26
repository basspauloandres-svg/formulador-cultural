from uuid import uuid4
from backend.domain import Project, POR_VERIFICAR, VesterRelation, calculate_vester


def test_project_initializes_s01_s16():
    p = Project(user_id=uuid4(), title="Caso")
    assert list(p.sections) == [f"S{i:02d}" for i in range(1, 17)]


def test_empty_value_becomes_por_verificar():
    p = Project(user_id=uuid4(), title="Caso")
    p.sections["S04"].set_value("fuente", "")
    assert p.sections["S04"].data["fuente"] == POR_VERIFICAR


def test_vester_is_deterministic():
    rels = [
        VesterRelation("A", "B", 3, "A influye directamente en B"),
        VesterRelation("B", "A", 1, "B tiene influencia menor en A"),
    ]
    result = calculate_vester(rels)
    assert result["A"] == {"influence": 3, "dependence": 1}
    assert result["B"] == {"influence": 1, "dependence": 3}


def test_vester_justification_is_optional():
    relation = VesterRelation("A", "B", 2)
    assert relation.justification is None


def test_vester_rejects_duplicate_directed_pair():
    import pytest
    with pytest.raises(ValueError, match="duplicada"):
        calculate_vester([VesterRelation("A", "B", 1), VesterRelation("A", "B", 2)])


def test_vester_rejects_invalid_score_and_diagonal():
    import pytest
    for value in [-1, 4, True, 1.0, "2"]:
        with pytest.raises(ValueError):
            VesterRelation("A", "B", value)
    with pytest.raises(ValueError):
        VesterRelation("A", "A", 0)


def test_vester_permutation_and_zero():
    rels = [VesterRelation("A", "B", 0), VesterRelation("B", "A", 3),
            VesterRelation("B", "C", 1), VesterRelation("C", "B", 2)]
    assert calculate_vester(rels) == calculate_vester(list(reversed(rels)))
    assert calculate_vester(rels)["A"] == {"influence": 0, "dependence": 3}
