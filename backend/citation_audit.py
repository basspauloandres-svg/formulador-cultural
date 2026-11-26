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
        if item.get("kind") not in {"pdf", "municipal_html", "administrative_registry"}:
            continue
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
        support = []
        malformed = re.findall(r"\[(?:F|M|N)\d[^\]\n]*\]", fragment, flags=re.I)
        malformed = [ref for ref in malformed if not CITATION.fullmatch(ref)]
        for ref in dict.fromkeys(refs):
            status = "INSUFFICIENT_EVIDENCE"
            if ref not in lookup:
                status = "INVALID_PROVENANCE"
            else:
                for item in lookup[ref]:
                    if item.get("kind") == "administrative_registry":
                        expected = normalize("El conjunto administrativo eenq-ga7s de Datos Abiertos Colombia contiene registros de organizaciones y entidades del sector Cultura asociados al código DIVIPOLA " + str(item.get("divipola", "")))
                        if re.fullmatch(r"\d{5}", str(item.get("divipola",""))) and body == expected:
                            status = "REGISTRY_FACT_REVIEW_REQUIRED"
                        continue
                    excerpt = item["prompt_excerpt"]
                    excerpt = excerpt.split("Extracto:", 1)[-1] if "Extracto:" in excerpt else CITATION.sub("", excerpt, count=1)
                    if len(body.split()) >= 5 and body in [normalize(part) for part in re.split(r"(?<=[.!?])\s+|\n+", excerpt)]:
                        status = "LITERAL_MATCH_REVIEW_REQUIRED"
            support.append({"citation":ref,"status":status})
        statuses = {item["status"] for item in support}
        if malformed or "INVALID_PROVENANCE" in statuses:
            status = "INVALID_PROVENANCE"
        elif not support or "INSUFFICIENT_EVIDENCE" in statuses or len(statuses) != 1:
            status = "INSUFFICIENT_EVIDENCE"
        else:
            status = next(iter(statuses))
        claims.append({"fragment":fragment,"citations":refs,"status":status,
                       "citation_support":support,"malformed_citations":malformed})
    return claims
