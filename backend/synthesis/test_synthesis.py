from backend.synthesis.application import SynthesisService
from backend.synthesis.domain import SynthesisInputs, basic_review


def test_proposal_uses_only_confirmed_inputs_without_ai():
    service = SynthesisService()
    inputs = SynthesisInputs(
        central_problem="Baja participación sostenida",
        population="jóvenes de la banda",
        territory="Villamaría",
    )
    proposal = service.propose(inputs)[0]
    assert "Baja participación sostenida" in proposal
    assert "jóvenes de la banda" in proposal
    assert "Villamaría" in proposal


def test_missing_evidence_is_flagged():
    review = basic_review(
        "Baja participación sostenida",
        SynthesisInputs(
            central_problem="Baja participación sostenida",
            population="jóvenes",
            territory="Villamaría",
            evidence=(),
        ),
    )
    assert any("evidencia trazable" in note for note in review.observations)


def test_solution_absence_wording_is_flagged():
    review = basic_review(
        "Falta de un programa de formación",
        SynthesisInputs(
            central_problem="Falta de un programa de formación",
            population="jóvenes",
            territory="Villamaría",
            evidence=("Registro institucional",),
        ),
    )
    assert any("ausencia de una solución" in note for note in review.observations)
