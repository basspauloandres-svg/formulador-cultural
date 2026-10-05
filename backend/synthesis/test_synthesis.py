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
    assert any("necesidad, acción o solución" in note for note in review.observations)


def test_solution_oriented_central_produces_reformulation_options():
    service = SynthesisService()
    inputs = SynthesisInputs(
        central_problem="La banda requiere talleres individuales de instrumentos para mejorar cada sección",
        population=None,
        territory="Villamaría",
    )
    proposals = service.propose(inputs)
    assert len(proposals) == 3
    assert all("requiere talleres" not in proposal.lower() for proposal in proposals)
    assert all("Villamaría" in proposal for proposal in proposals)
    assert any("Dificultades" in proposal for proposal in proposals)


def test_reformulation_does_not_confirm_evidence_or_causality():
    service = SynthesisService()
    inputs = SynthesisInputs(
        central_problem="La organización necesita crear un programa para aumentar la participación",
        population=None,
        territory="Anserma",
    )
    proposals = service.reformulate(inputs)
    joined = " ".join(proposals).lower()
    assert "evidencia" not in joined
    assert "causa" not in joined
    assert "demuestra" not in joined
