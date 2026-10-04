from uuid import uuid4
import pytest
from domain import Project, POR_VERIFICAR, VesterRelation, calculate_vester


def test_project_initializes_s01_s08():
    p = Project(user_id=uuid4(), title="Caso")
    assert list(p.sections) == [f"S{i:02d}" for i in range(1, 9)]


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


def test_vester_rejects_missing_justification():
    with pytest.raises(ValueError):
        VesterRelation("A", "B", 2, "")
