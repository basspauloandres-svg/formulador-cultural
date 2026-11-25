"""Conservative citation audit. Exact support is not general semantic entailment."""
import re
import unicodedata
from hashlib import sha256

CITATION = re.compile(r"\[((?:F\d+,\s*p\.\d+)|[MN]\d+)\]", re.I)
def canonical(s):
    return re.sub(r"\s+", "", s).upper()

def normalize(s):
    return " ".join(re.findall(r"\w+", unicodedata.normalize("NFKC", s).casefold()))

def audit_citations(draft, manifest):
    lookup = {}
    for item in manifest:
        excerpt = item.get("prompt_excerpt", "")
        if sha256(excerpt.encode()).hexdigest() != item.get("excerpt_sha256"):
            continue
        if not re.fullmatch(r"[0-9a-f]{64}", item.get("sha256") or ""):
            continue
        lookup.setdefault(canonical(item["citation"]), []).append(item)
    claims = []
    # Preserve citation after a sentence and do not split the PDF page locator.
    protected = CITATION.sub(lambda m: m.group().replace(".", "\u2024"), draft or "")
    protected = re.sub(r"([.!?])\s+(\[(?:F\d+,\s*p\u2024\d+|[MN]\d+)\])", r" \2\1", protected, flags=re.I)
    for fragment in re.split(r"(?<=[.!?])\s+|\n+", protected):
        fragment = fragment.replace("\u2024", ".").strip()
        if not fragment:
            continue
        refs = [canonical(x) for x in CITATION.findall(fragment)]
        body = normalize(CITATION.sub("", fragment))
        status = "INSUFFICIENT_EVIDENCE"
        if refs and all(ref in lookup for ref in refs):
            # Only literal excerpt correspondence, not a paraphrase verdict.
            for ref in refs:
                for item in lookup[ref]:
                    if item.get("kind") == "administrative_registry":
                        expected = normalize("El conjunto administrativo eenq-ga7s de Datos Abiertos Colombia contiene registros de organizaciones y entidades del sector Cultura asociados al código DIVIPOLA " + str(item.get("divipola", "")))
                        if re.fullmatch(r"\d{5}", str(item.get("divipola",""))) and body == expected:
                            status = "REGISTRY_FACT_REVIEW_REQUIRED"
                        continue
                    excerpt = item["prompt_excerpt"]
                    excerpt = excerpt.split("Extracto:", 1)[-1] if item["kind"] == "municipal_html" else CITATION.sub("", excerpt, count=1)
                    if len(body.split()) >= 5 and body in [normalize(part) for part in re.split(r"(?<=[.!?])\s+|\n+", excerpt)]:
                        status = "LITERAL_MATCH_REVIEW_REQUIRED"
        if refs and any(ref not in lookup for ref in refs):
            status = "INVALID_PROVENANCE"
        claims.append({"fragment":fragment,"citations":refs,"status":status})
    return claims
