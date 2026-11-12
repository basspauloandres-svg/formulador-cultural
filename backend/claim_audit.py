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
    normalized = normalize(text)
    results = []
    for hit in CLAIM_PATTERN.finditer(normalized):
        start = max(0, hit.start() - 85)
        end = min(len(normalized), hit.end() + 75)
        local_context = normalized[start:end]
        if HYPOTHESIS_PATTERN.search(local_context):
            continue
        results.append({
            "type": "UNSUPPORTED_CAUSAL_CLAIM",
            "status": "INSUFFICIENT_EVIDENCE",
            "fragment": text[max(0, hit.start() - 45):min(len(text), hit.end() + 60)],
            "instruction": "Reformula como hipótesis y especifica qué relación requiere fuente.",
        })
    return results[:5]
