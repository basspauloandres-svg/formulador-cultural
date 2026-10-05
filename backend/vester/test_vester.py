import pytest
from backend.vester.domain import VesterProblem, VesterRelation, calculate_results


def test_calculate_results_is_deterministic():
    problems = [VesterProblem("a", "A"), VesterProblem("b", "B"), VesterProblem("c", "C")]
    relations = [
        VesterRelation("a", "b", 3), VesterRelation("b", "a", 1),
        VesterRelation("a", "c", 2), VesterRelation("c", "a", 0),
        VesterRelation("b", "c", 1), VesterRelation("c", "b", 2),
    ]
    result = calculate_results(problems, relations)
    by_id = {p.problem_id: p for p in result.positions}
    assert by_id["a"].influence == 5
    assert by_id["a"].dependence == 1
    assert by_id["b"].influence == 2
    assert by_id["b"].dependence == 5
    assert by_id["c"].influence == 2
    assert by_id["c"].dependence == 3


def test_incomplete_matrix_is_rejected():
    problems = [VesterProblem("a", "A"), VesterProblem("b", "B")]
    with pytest.raises(ValueError, match="incompleta"):
        calculate_results(problems, [VesterRelation("a", "b", 2)])


def test_justification_is_optional():
    relation = VesterRelation("a", "b", 0)
    assert relation.justification is None
