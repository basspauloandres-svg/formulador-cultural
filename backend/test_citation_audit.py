from hashlib import sha256
from citation_audit import audit_citations

def entry(citation="F1, p.1", text="[F1, p.1] El municipio realizó cinco talleres de música.", kind="pdf", **kwargs):
    return dict(citation=citation,prompt_excerpt=text,kind=kind,sha256="a"*64,excerpt_sha256=sha256(text.encode()).hexdigest(),**kwargs)

def test_literal_sentence_and_page():
    m=[entry()]
    assert audit_citations("El municipio realizó cinco talleres de música [F1, p.1].",m)[0]["status"]=="LITERAL_MATCH_REVIEW_REQUIRED"
    assert audit_citations("El municipio realizó cinco talleres de música [F1, p.2].",m)[0]["status"]=="INVALID_PROVENANCE"

def test_negation_and_paraphrase_do_not_certify():
    m=[entry(text="[F1, p.1] No consta que el municipio realizó cinco talleres de música.")]
    assert audit_citations("El municipio realizó cinco talleres de música [F1, p.1].",m)[0]["status"]=="INSUFFICIENT_EVIDENCE"
    assert audit_citations("Hubo cinco talleres de música [F1, p.1].",m)[0]["status"]=="INSUFFICIENT_EVIDENCE"

def test_tampering():
    m=[entry()]
    m[0]["prompt_excerpt"]+=" Falsificación."
    assert audit_citations("El municipio realizó cinco talleres de música [F1, p.1].",m)[0]["status"]=="INVALID_PROVENANCE"

def test_registry_scope():
    fact="El conjunto administrativo eenq-ga7s de Datos Abiertos Colombia contiene registros de organizaciones y entidades del sector Cultura asociados al código DIVIPOLA 05001"
    m=[entry("N1","[N1] "+fact+".", "administrative_registry",divipola="05001")]
    assert audit_citations(fact+" [N1].",m)[0]["status"]=="REGISTRY_FACT_REVIEW_REQUIRED"
    assert audit_citations("Existen 100 organizaciones activas [N1].",m)[0]["status"]=="INSUFFICIENT_EVIDENCE"

def test_post_sentence_reference():
    assert audit_citations("El municipio realizó cinco talleres de música. [F1, p.1]",[entry()])[0]["status"]=="LITERAL_MATCH_REVIEW_REQUIRED"

def test_unknown_provenance_kind():
    m=[entry(kind="untrusted_index")]
    assert audit_citations("El municipio realizó cinco talleres de música [F1, p.1].",m)[0]["status"]=="INVALID_PROVENANCE"

def test_uncited_sentence_remains_insufficient():
    out=audit_citations("El municipio realizó cinco talleres de música [F1, p.1]. Existen efectos positivos.",[entry()])
    assert [c["status"] for c in out]==["LITERAL_MATCH_REVIEW_REQUIRED","INSUFFICIENT_EVIDENCE"]
