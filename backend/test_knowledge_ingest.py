import pytest
from reportlab.pdfgen import canvas
from hashlib import sha256
from knowledge_ingest import prepare_manifest
from knowledge_index import KnowledgeIndex,digest

def fixture(tmp_path):
    p=tmp_path/"fixture.pdf"
    c=canvas.Canvas(str(p))
    c.drawString(30,740,"Documento de prueba para definir actividades y productos.")
    c.showPage()
    c.save()
    row={"id":"QA-1","file":p.name,"page":1,"title":"Documento sintetico",
        "publisher":"Institucion ficticia","edition":"1","url":"https://example.org/fixture.pdf",
        "topics":["actividades","productos"],"rights_basis":"Synthetic test",
        "reviewed_by":"test curator","reviewed_at":"2026-11-25","visibility":"PUBLIC",
        "status":"CURATOR_APPROVED","excerpt":"Documento de prueba para definir actividades y productos."}
    return p,row

def test_literal_page_and_hash(tmp_path):
    p,row=fixture(tmp_path)
    out=prepare_manifest([row],tmp_path)[0]
    assert out["document_sha256"]==sha256(p.read_bytes()).hexdigest()
    assert out["excerpt_sha256"]==digest(row["excerpt"])
    assert out["locator"]=="PDF p. 1"
    assert "file" not in out and "page" not in out
    assert KnowledgeIndex([out]).retrieve("actividades productos")["passages"]

def test_rejects_false_excerpt_wrong_page_private_unreviewed_duplicate(tmp_path):
    _,row=fixture(tmp_path)
    for changes in ({"page":2},{"excerpt":"Afirmacion no presente en el documento."},
                    {"visibility":"PRIVATE"},{"status":"CANDIDATE"},{"rights_basis":""},
                    {"reviewed_at":"invalid"},{"page":True}):
        with pytest.raises(ValueError):
            prepare_manifest([{**row,**changes}],tmp_path)
    with pytest.raises(ValueError):
        prepare_manifest([row,row],tmp_path)

def test_rejects_pdf_outside_corpus_directory(tmp_path):
    _,row=fixture(tmp_path)
    sub=tmp_path/"corpus";sub.mkdir()
    with pytest.raises(ValueError):
        prepare_manifest([{**row,"file":"../fixture.pdf"}],sub)
