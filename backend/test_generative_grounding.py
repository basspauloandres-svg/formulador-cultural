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
