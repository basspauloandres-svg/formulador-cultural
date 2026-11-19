"""Valla conservadora contra adiciones factuales de modelos generativos.

Permite reescritura del texto del formador, pero elimina oraciones que
introducen ciertos constructos culturales, causales o eventos no presentes en
el texto original ni en extractos descargados durante esta solicitud.

Es un control léxico limitado, NO un verificador semántico de verdad.
"""
from __future__ import annotations
import re
import unicodedata

CONCEPTS: dict[str, str] = {
    "cohesion_social": r"\bcohesion (?:social|comunitaria)\b",
    "identidad_cultural": r"\bidentidad (?:cultural|regional|local)\b",
    "festividades": r"\b(?:festividad(?:es)?|celebracion(?:es)?|festivales?)\b",
    "participacion": r"\b(?:participa(?:n|cion|ndo)?|asistencia|involucra(?:n)?)\b",
    "impacto": r"\b(?:impacto(?:s)?|beneficio(?:s)?|efecto(?:s)?)\b",
    "patrimonio": r"\bpatrimonio\b",
    "platos": r"\bplatos? (?:tipicos?|tradicionales?|regionales?)\b",
    "tradicion": r"\btradicion(?:es|al(?:es)?)?\b",
    "desarrollo": r"\bdesarrollo (?:musical|cultural|social)\b",
    "convivencia": r"\bconvivencia\b",
    "influencia": r"\b(?:influye|influencia|contribuye|fortalece|genera|produce|promueve|refleja|transforma)\b",
}

def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKD", value.casefold())
    return "".join(c for c in value if not unicodedata.combining(c))


def guard_generated_claims(generated: str, original: str,
                           live_evidence: str | None = None) -> tuple[str, list[dict]]:
    """Descarta oraciones con constructos nuevos, sin atribuirles falsedad.

    Solo el contenido extraído en vivo cuenta como posible contexto autorizado.
    Una referencia indexada o metadatos de búsqueda nunca cuentan como evidencia.
    """
    # Las etiquetas de fuente, URL y títulos no acreditan conceptos: se
    # consideran únicamente los extractos documentales propiamente dichos.
    extracts = []
    for line in (live_evidence or "").splitlines():
        if "Extracto:" in line:
            extracts.append(line.split("Extracto:", 1)[1])
        elif re.match(r"^\[F\d+,\s*p\.\d+\]", line):
            extracts.append(line.split("]", 1)[1])
    authorized = normalize(original + "\n" + "\n".join(extracts))
    approved, flags = [], []
    sentences = re.split(r"(?<=[.!?])\s+|\n+", generated.strip())
    for sentence in sentences:
        normalized = normalize(sentence)
        novel = [name for name, regex in CONCEPTS.items()
                 if re.search(regex, normalized) and not re.search(regex, authorized)]
        # Nunca introducir cifras o años que el formador no aportó y que
        # tampoco aparecen en un extracto obtenido durante esta petición.
        de_cited = re.sub(r"\\[(?:F\\d+,\\s*p\\.\\d+|M\\d+)\\]", "", normalized)
        numbers = set(re.findall(r"(?<!\\w)\\d+(?:[.,]\\d+)*(?!\\w)", de_cited))
        known = set(re.findall(r"(?<!\\w)\\d+(?:[.,]\\d+)*(?!\\w)", authorized))
        if numbers - known:
            novel.append("cifras_nuevas_sin_fuente")
        if novel:
            flags.append({
                "type": "GENERATIVE_CONTENT_NOT_IN_SOURCE",
                "status": "INSUFFICIENT_EVIDENCE",
                "concepts": novel,
                "fragment": sentence[:240],
                "instruction": "Se omitió contenido añadido por la IA sin sustento en el texto original ni en extractos descargados.",
            })
        elif sentence.strip():
            approved.append(sentence.strip())
    if not approved:
        # Se devuelve exactamente el texto original: la IA no agrega hechos.
        approved = [original.strip()]
        flags.append({
            "type": "GENERATIVE_FALLBACK_ORIGINAL",
            "status": "INSUFFICIENT_EVIDENCE",
            "instruction": "El modelo introdujo afirmaciones nuevas. Se conserva el texto original como aporte sin verificar.",
        })
    return " ".join(approved)[:1600], flags[:10]
