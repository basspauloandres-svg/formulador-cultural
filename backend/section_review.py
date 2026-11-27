"""Revisión de afirmaciones transversal a secciones de VÉRTICE.

Los metadatos de búsqueda NO corroboran hechos. Ninguna respuesta clasifica
afirmaciones como verificadas sin un pasaje original y un cotejo adicional.
"""
from __future__ import annotations

import re
from fastapi import HTTPException
from pydantic import BaseModel, Field
from assistant_pilot import verified_user
from source_research import ResearchRequest, research
from automatic_assistant import municipality_key, TERRITORIAL_IDENTITIES
from municipal_sources import municipal_passages
from evidence_drafting import compose_section_draft
from knowledge_assistant import KnowledgeRequest, route_knowledge, load_index
from prompt_boundary import contains_directive
from typing import Literal
from territory_registry import resolve_territory, normalized as territory_normalized

REVIEW_FIELDS = {
    "S02": {
        "territorio_o_lugar_de_intervencion": "territorio_o_lugar_de_intervencion",
        "caracteristicas_culturales": "caracteristicas_culturales",
        "principales_dinamicas_sociales": "principales_dinamicas_sociales",
        "antecedentes": "antecedentes",
    },
    "S03": {key: "principales_dinamicas_sociales" for key in (
        "poblacion_afectada", "poblacion_participante", "caracterizacion", "cantidad_estimada")},
    "S04": {key: "antecedentes" for key in (
        "evidencia_disponible", "fuentes", "datos_por_verificar", "observaciones")},
    "S05": {key: "principales_dinamicas_sociales" for key in (
        "situaciones_observables", "descripcion", "evidencia_asociada", "prioridad_preliminar")},
    "S07": {key: "principales_dinamicas_sociales" for key in (
        "causas_indirectas", "causas_directas", "problema_central",
        "efectos_directos", "efectos_indirectos")},
    "S08": {key: "principales_dinamicas_sociales" for key in (
        "enunciado", "poblacion_afectada", "evidencia_soporte", "alcance")},
    "S09": {key: "antecedentes" for key in (
        "objetivo_central", "medios_directos", "medios_indirectos", "fines_directos", "fines_indirectos")},
    "S10": {key: "antecedentes" for key in (
        "alternativa_seleccionada", "criterios", "justificacion_seleccion")},
    "S11": {key: "antecedentes" for key in (
        "resultados_productos", "actividades_confirmadas", "observaciones_actividades")},
    "S12": {key: "principales_dinamicas_sociales" for key in (
        "indicadores_confirmados", "metas_confirmadas", "medios_verificacion")},
    "S14": {"presupuesto_resumen": "antecedentes"},
    "S15": {"riesgos_resumen": "principales_dinamicas_sociales"},
}
# S01 es contexto suministrado por el usuario; S06 requiere juicio de
# causalidad/valoración, S13 cálculo del cronograma y S16 revisión de coherencia.
# No les aplica la misma comprobación documental por oración.

HYPOTHESIS = re.compile(
    r"\b(podr[ií]a|podr[ií]an|hip[oó]tesis|posible|posiblemente|"
    r"se plantea|se espera|se propone|por verificar|se estima)\b", re.I)
FIGURE = re.compile(r"(?<!\w)\d[\d.,%]*\b")
CLAIM = re.compile(r"\b(es|son|existe|existen|tiene|tienen|representa|"
                   r"cuenta con|influye|genera|causa|produce|fortalece|afecta|"
                   r"registra|participa|hay|presenta|se ubica|se encuentra)\b", re.I)


class SectionReviewRequest(BaseModel):
    section: str = Field(min_length=3, max_length=3)
    field: str = Field(min_length=2, max_length=100)
    text: str = Field(min_length=1, max_length=1800)
    context: str = Field(default="", max_length=200)
    include_web: bool = True
    public_topic: str = Field(default="", max_length=90)
    compose: bool = False
    operation: Literal['research', 'edit'] = 'research'


def split_claims(value: str) -> list[str]:
    """Separación provisional de varias afirmaciones incluidas en una frase.

    Conserva el texto original en cada fragmento; no deduce hechos ni relaciones
    entre la proximidad geográfica, la gastronomía y las prácticas musicales.
    """
    sentences = re.split(r"(?<=[.!?])\s+|\n+", value.strip())
    parts = []
    for sentence in sentences:
        segments = re.split(r",\s+(?=(?:es|son|se|tiene|hay)\b)", sentence, flags=re.I)
        for segment in segments:
            # En «su gastronomía y su proceso musical» hay dos afirmaciones
            # sustantivas que requieren fuentes independientes.
            subparts = re.split(r"\s+y\s+(?=su\s+(?:proceso|tradici[oó]n|actividad|pr[aá]ctica|gastronom[ií]a|m[uú]sica)\b)",
                                segment, flags=re.I)
            parts.extend(part.strip() for part in subparts if len(part.strip()) >= 5)
    return parts[:18]


def claim_source_need(statement: str) -> tuple[str, str]:
    value = statement.casefold()
    if FIGURE.search(statement):
        return "DEMOGRAFIA_O_CIFRA", "Localizar la variable original, unidad, año y cobertura municipal antes de usar la cifra."
    if re.search(r"gastronom|culinari|plato(s)? t[ií]pic", value):
        return "GASTRONOMIA", "Buscar inventarios culturales, estudios o registros municipales de prácticas gastronómicas."
    if re.search(r"m[uú]sic|banda|agrupaci[oó]n|orquesta|escuela de arte", value):
        return "PRACTICAS_MUSICALES", "Comprobar existencia, fechas y alcance de las prácticas musicales en documentos o registros locales."
    if re.search(r"cerca|ubic|casco urbano|geogr[aá]f|l[ií]mite|distancia", value):
        return "TERRITORIO", "Contrastar la delimitación y relación espacial con cartografía o documentación territorial oficial."
    if re.search(r"genera|causa|influye|fortalece|afecta|transforma", value):
        return "RELACION_CAUSAL", "Separar observación de relación causal y buscar evidencia específica para esta última."
    return "OTRA_AFIRMACION", "Requiere una fuente original o un registro de observación pertinente."


def classify_claim(statement: str) -> dict:
    speculative = bool(HYPOTHESIS.search(statement))
    quantitative = bool(FIGURE.search(statement))
    factual = bool(CLAIM.search(statement)) or quantitative
    category, instruction = claim_source_need(statement)
    source_required = factual or category != "OTRA_AFIRMACION"
    status = ("HYPOTHESIS_UNVERIFIED" if speculative else
              "USER_ASSERTION_UNVERIFIED" if source_required else
              "USER_TEXT_NOT_ASSESSED")
    return {
        "statement": statement[:400],
        "classification": status,
        "review_category": category,
        "evidence_status": "INSUFFICIENT_EVIDENCE",
        "requires_source": source_required,
        "note": instruction if source_required else
                "Determinar si es propuesta, observación o afirmación antes de presentarlo como hecho.",
        "supporting_passages": [],
    }


def edit_user_contribution(req: SectionReviewRequest, claims: list[dict]) -> dict:
    """Conservative editorial operation; no web, territorial lookup or model."""
    base = {"section": req.section, "field": req.field,
            "territory_context": req.context, "operation": "edit",
            "suggestion_origin": "USER_CONTRIBUTION_EDITORIAL",
            "evidence_status": "INSUFFICIENT_EVIDENCE", "verified_claims": [],
            "primary_passages": [], "candidate_sources": [], "evidence_used": [],
            "requires_approval": True, "claims": claims, "errors": [],
            "review_flags": [], "model_calls": 0, "external_queries": 0}
    raw = req.text.strip()
    if contains_directive(raw) or not raw or raw.endswith("?") or re.match(
        r"^(?:investiga|busca|averigua|consulta|dime|no s[eé]|no conozco|desconozco)\b", raw, re.I):
        return {**base, "suggestion": None, "draft_status": "REQUIRES_USER_CONTRIBUTION",
                "note": "Escribe tu aporte o utiliza la investigación para resolver preguntas factuales."}
    if req.section == "S03" and req.field in ("poblacion_participante", "poblacion_afectada"):
        value = " ".join(raw.split()).rstrip(".")
        # Only normalize a known nominal opening; do not alter internal names,
        # quantities, negations or qualifications.
        match = re.match(r"^(niños y niñas|niñas y niños|estudiantes|jóvenes|personas|familias)\b", value, re.I)
        if match and not re.search(r"[.!?;\n]|\b(?:pero|aunque|excepto|sin embargo|son|están|participan|tienen|pueden|no)\b", value, re.I):
            label = "participante" if req.field == "poblacion_participante" else "afectada"
            articles = {"niños y niñas":"los niños y las niñas", "niñas y niños":"las niñas y los niños", "estudiantes":"los estudiantes", "jóvenes":"los jóvenes", "personas":"las personas", "familias":"las familias"}
            body = articles[match.group(0).casefold()] + value[match.end():]
            suggestion = f"Según el aporte del docente, la población {label} comprende {body}."
        else:
            suggestion = raw
        guidance = route_knowledge(KnowledgeRequest(section=req.section, question=req.field.replace("_", " ")), load_index())
    else:
        # No semantic reformulation of an arbitrary assertion without a model.
        suggestion = raw
        guidance = {"route":"ABSTAIN","status":"INSUFFICIENT_EVIDENCE","passages":[]}
    return {**base, "suggestion": suggestion, "draft_status": "EDITABLE_USER_CONTRIBUTION",
            "methodological_guidance": guidance,
            "note": "Aporte docente pendiente de verificación; no constituye evidencia documental."}


async def review_section(req: SectionReviewRequest, authorization: str) -> dict:
    mapping = REVIEW_FIELDS.get(req.section)
    if mapping is None or req.field not in mapping:
        raise HTTPException(422, "Este campo no utiliza la auditoría documental transversal.")
    # Verificar autenticación antes de consultar servicios externos.
    user_id = await verified_user(authorization)
    claims = [classify_claim(s) for s in split_claims(req.text)]
    if req.operation == 'edit':
        return edit_user_contribution(req, claims)
    if len(req.context.strip()) < 2:
        raise HTTPException(422, "Registra primero el municipio para investigar.")
    territorial_result = await resolve_territory(req.context)
    identity = territorial_result.get("identity")
    key = ((territory_normalized(identity["municipality"]),
            territory_normalized(identity["department"])) if identity else None)
    administrative_field = (req.section == "S02" and
                            req.field == "territorio_o_lugar_de_intervencion")
    # La identificación por DIVIPOLA se verifica en el directorio institucional.
    # Que el proyecto elija el municipio es una declaración del formador,
    # no una estadística cultural que requiera corroboración externa.
    if administrative_field and not req.public_topic and identity and territorial_result["status"] == "FOUND":
        normalized = req.text.casefold()
        is_simple_territory = not re.search(
            r"gastronom|m[uú]sic|banda|poblaci[oó]n|habitantes|"
            r"cohesi[oó]n|causa|influye|producci[oó]n|festiv|"
            r"cercan[ií]a|l[ií]mite|distancia|vereda", normalized)
        if is_simple_territory:
            statement = {
                "statement": f"{identity['municipality']}, {identity['department']} "
                             f"(DIVIPOLA {identity['divipola']})",
                "classification": "ADMINISTRATIVE_IDENTITY",
                "review_category": "TERRITORIO",
                "evidence_status": "ADMINISTRATIVE_REGISTRY_MATCH",
                "requires_source": False,
                "note": "Identificación administrativa respaldada por el registro territorial; "
                        "el lugar de intervención es una decisión del proyecto.",
                "supporting_passages": [],
                "registry_url": identity["url"],
            }
            kind = territory_normalized(identity["territory_type"])
            label = ("municipio" if kind == "municipio" else
                     "área no municipalizada" if "no municipalizada" in kind else
                     "territorio administrativo")
            draft = (f"El proyecto tiene como territorio de intervención {('el ' if label != 'área no municipalizada' else 'el área denominada ')}"
                     f"{label + ' de ' if label != 'área no municipalizada' else ''}"
                     f"{identity['municipality']}, departamento de {identity['department']} "
                     f"(código DIVIPOLA {identity['divipola']}).")
            return {
                "section": req.section, "field": req.field,
                "territory_context": req.context, "territory": identity,
                "territory_resolution": territorial_result["status"],
                "claims": [statement], "candidate_sources": [],
                "primary_passages": [], "verified_claims": [statement],
                "conflicting_municipalities": [], "errors": [],
                "suggestion": draft if req.compose else None,
                "draft_status": "EDITABLE_ADMINISTRATIVE_CONTEXT" if req.compose else "NOT_REQUESTED",
                "review_flags": [], "evidence_used": [],
                "evidence_status": "ADMINISTRATIVE_REGISTRY_MATCH",
                "requires_approval": True,
                "note": "La identidad territorial tiene respaldo institucional. "
                        "La selección del lugar de intervención procede de S01 y "
                        "requiere aprobación del formador, no corroboración cultural.",
            }
    mapping_field = mapping[req.field]
    candidates, errors = [], []
    web_extended_enabled = None
    try:
        found = await research(ResearchRequest(
            section="S02", field=mapping_field,
            text=(req.text if len(req.text) >= 10 else "Información territorial de " + req.context),
            context=req.context, include_web=req.include_web, public_topic=req.public_topic,
        ), authorization)
        candidates = found["sources"]
        errors = found["errors"]
        web_extended_enabled = found.get("web_extended_enabled")
    except HTTPException as exc:
        if exc.status_code not in (429, 502, 503, 504):
            raise
        errors.append("Búsqueda documental temporalmente limitada; la revisión de afirmaciones sigue disponible.")
    categories = {item["review_category"] for item in claims}
    primary_passages = (await municipal_passages(key, categories)
                        if req.section == "S02" else [])
    # Asociación categorial, no inferencia de respaldo lógico.
    for claim in claims:
        claim["candidate_passages"] = [{
            "source_id": p.get("source_id"),
            "locator": p.get("locator"),
            "url": p.get("url"),
            "passage_status": p.get("passage_status"),
            "corroboration_status": "INSUFFICIENT_EVIDENCE",
        } for p in primary_passages
            if p.get("category") == claim["review_category"]][:3]
    conflicts = []
    for other, other_identity in TERRITORIAL_IDENTITIES.items():
        if other != key and re.search(r"\b" + re.escape(other[0]) + r"\b",
                                       req.text.casefold()):
            conflicts.append(other_identity["municipality"])
    draft_result = {"suggestion": None, "draft_status": "NOT_REQUESTED",
                    "review_flags": [], "evidence_used": []}
    if req.compose:
        draft_result = await compose_section_draft(
            section=req.section, field=req.field, text=req.text,
            territory=req.context, claims=claims,
            passages=primary_passages, user_id=user_id)
    return {
        **draft_result,
        "section": req.section, "field": req.field,
        "territory_context": req.context,
        "territory": identity,
        "territory_resolution": territorial_result["status"],
        "territory_candidates": territorial_result.get("candidates", []),
        "claims": claims,
        "candidate_sources": candidates,
        "primary_passages": primary_passages,
        "verified_claims": [],
        "conflicting_municipalities": conflicts,
        "evidence_status": "INSUFFICIENT_EVIDENCE",
        "errors": errors,
        "web_extended_enabled": web_extended_enabled,
        "requires_approval": True,
        "note": ("Las referencias se vinculan a cada afirmación por categoría. "
                 "Una coincidencia temática o un pasaje localizado no comprueba "
                 "el contenido de la afirmación. Se conservan los datos sin respaldo "
                 "como INSUFFICIENT_EVIDENCE."),
    }
