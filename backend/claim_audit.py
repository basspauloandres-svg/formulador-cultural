"""Auditoría determinista conservadora de afirmaciones de S02.

No valida hechos ni acredita fuentes: detecta algunas causalidades declaradas
sin señales explícitas de hipótesis o verificación.
"""
from __future__ import annotations
import re
import unicodedata

CLAIM_PATTERN = re.compile(
    r"\b(influye[n]?|gener[ao](?:n|ndo)?|contribuye[n]?|fortalece[n]?|"
    r"refleja[n]?|garantiza[n]?|demuestra[n]?|produce[n]?|"
    r"impacta[n]?|transforma[n]?|favorece[n]?|"
    r"promueve[n]?|es (?:un )?motor de)\b",
    re.IGNORECASE,
)
HYPOTHESIS_PATTERN = re.compile(
    r"\b(podria[n]?|podria estar|puede[n]?|posible(?:mente)?|"
    r"hipotesis|se plantea|se propone investigar|presuntamente|"
    r"requiere (?:ser )?verificad|por verificar|por comprobar)\b",
    re.IGNORECASE,
)


def normalize(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value.casefold())
    return "".join(char for char in decomposed if not unicodedata.combining(char))


def audit_claims(text: str) -> list[dict]:
    """Devuelve banderas, no dictámenes de veracidad.

    El contexto local examinado evita que un marcador al final de otro
    párrafo «verifique» automáticamente todo el texto.
    """
    results = []
    # A qualification in a different sentence cannot exempt a causal claim.
    for sentence in re.split(r"(?<=[.!?;])\s+|\n+", text):
        normalized = normalize(sentence)
        for hit in CLAIM_PATTERN.finditer(normalized):
            # Generic modal verbs elsewhere in the sentence are not enough.
            prefix = normalized[max(0, hit.start()-85):hit.start()]
            explicit = re.search(r"\b(?:hipotesis|se propone investigar|presuntamente)\b", prefix)
            modal = re.search(r"\b(?:podria[n]?|puede[n]?|posiblemente)\s+(?:\w+\s+){0,2}$", prefix)
            if explicit or modal:
                continue
            results.append({
                "type": "UNSUPPORTED_CAUSAL_CLAIM",
                "status": "INSUFFICIENT_EVIDENCE",
                "fragment": sentence[:240],
                "instruction": "Reformula como hipótesis y especifica qué relación requiere fuente.",
            })
    return results[:5]


def qualify_claims(text: str) -> tuple[str, list[dict]]:
    """Reformula proposiciones causales detectadas como hipótesis editables.

    No certifica el resto de la respuesta. Devuelve las alertas para revisión
    y evita que el formador pierda el borrador completo.
    """
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    rewritten = []
    flagged = []
    for sentence in sentences:
        issues = audit_claims(sentence)
        if issues:
            flagged.extend(issues)
            lead = sentence[0].lower() + sentence[1:] if sentence else sentence
            rewritten.append("Se plantea como hipótesis por verificar que " +
                             lead.rstrip(" .") + " [POR VERIFICAR].")
        else:
            rewritten.append(sentence)
    return " ".join(rewritten), flagged[:5]
