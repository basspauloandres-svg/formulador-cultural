"""Regresiones del filtro de adiciones generativas en VÉRTICE."""
import os
import sys
sys.path.insert(0,os.path.dirname(__file__))
from generative_grounding import guard_generated_claims

ORIGINAL=("Municipio cercano al casco urbano de Manizales, Villamaría, Caldas, "
          "se distingue por su gastronomía local y procesos musicales en bandas.")
CREATIVE=("Villamaría tiene gastronomía local y bandas musicales. "
          "Los platos tradicionales reflejan la identidad regional. "
          "Las bandas participan en festividades comunitarias. "
          "Las bandas fortalecen la cohesión social del municipio.")

def test_invented_identity_festivities_and_cohesion_are_removed():
    draft, flags = guard_generated_claims(CREATIVE, ORIGINAL)
    assert "Villamaría tiene gastronomía local y bandas musicales." in draft
    assert "identidad regional" not in draft
    assert "festividades" not in draft
    assert "cohesión social" not in draft
    assert len([flag for flag in flags if flag["type"] == "GENERATIVE_CONTENT_NOT_IN_SOURCE"]) == 3

def test_qualifying_a_hallucinated_claim_as_hypothesis_does_not_save_it():
    draft, flags=guard_generated_claims(
        "Se plantea la hipótesis de que las bandas contribuyen a la cohesión social.",
        ORIGINAL)
    assert draft == ORIGINAL
    assert flags[-1]["type"] == "GENERATIVE_FALLBACK_ORIGINAL"

def test_indexed_reference_cannot_authorize_additional_facts():
    indexed="La Alcaldía habría descrito una banda que fortalece la cohesión social."
    draft,flags=guard_generated_claims(
        "Las bandas fortalecen la cohesión social.",
        ORIGINAL, None)
    assert draft == ORIGINAL and flags
    assert indexed not in draft

def test_retrieved_passage_can_supply_lexical_context_without_verifying_claim():
    draft,flags=guard_generated_claims(
        "La banda participa en festividades.",
        ORIGINAL,
        "[M1] Extracto: La banda participa en festividades municipales.")
    assert "participa en festividades" in draft
    assert not flags
    # El resultado no ha sido cotejado semánticamente: es solo una
    # barrera contra conceptos ausentes, nunca veredicto de evidencia.

def test_original_text_is_never_rewritten_into_supposedly_verified_truth():
    draft,flags=guard_generated_claims(
        "La música genera cohesión social comprobada en Villamaría.",
        "Los niños escuchan músicas de banda.")
    assert draft=="Los niños escuchan músicas de banda."
    assert flags


def test_novel_population_figure_is_rejected():
    draft, flags = guard_generated_claims(
        "Villamaría tiene 500000 habitantes en 2026.",
        "El proyecto se realizará en Villamaría, Caldas.")
    assert draft == "El proyecto se realizará en Villamaría, Caldas."
    assert any("cifras_nuevas_sin_fuente" in x.get("concepts", []) for x in flags)


def test_numeric_citations_do_not_trigger_new_population_values():
    draft, flags = guard_generated_claims(
        "La banda musical participa en festividades [M1].",
        "La banda musical se reúne en el municipio.",
        "[M1] Extracto: La banda musical participa en festividades.")
    assert "[M1]" in draft
    assert not flags


def test_national_registry_identifier_is_not_a_population_claim():
    evidence = "[N1] El registro contiene organizaciones asociadas al código DIVIPOLA 05001."
    draft, flags = guard_generated_claims(
        "Existen registros asociados al código DIVIPOLA 05001 [N1].", "", evidence)
    assert "05001 [N1]" in draft
    assert not flags


def test_national_registry_does_not_authorize_new_counts():
    evidence = "[N1] El registro contiene organizaciones asociadas al código DIVIPOLA 05001."
    for statement in ("Existen 500 organizaciones [N1].",
                      "Existen registros del código DIVIPOLA 11001 [N1]."):
        draft, flags = guard_generated_claims(statement, "", evidence)
        assert not draft
        assert any("cifras_nuevas_sin_fuente" in f.get("concepts", []) for f in flags)


def test_pdf_locator_does_not_introduce_a_numeric_claim():
    draft, flags = guard_generated_claims(
        "La banda realiza actividades musicales [F1, p.37].", "",
        "[F1, p.37] La banda realiza actividades musicales.")
    assert "[F1, p.37]" in draft
    assert not flags


def test_registry_identifier_reused_as_count_is_rejected():
    evidence = "[N1] El registro contiene organizaciones asociadas al código DIVIPOLA 05001."
    draft, flags = guard_generated_claims("Existen 05001 asistentes en DIVIPOLA 05001 [N1].", "", evidence)
    assert not draft
    assert any("cifras_nuevas_sin_fuente" in f.get("concepts", []) for f in flags)
