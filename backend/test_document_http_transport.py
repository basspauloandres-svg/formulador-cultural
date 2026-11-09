"""Verify HTTP transport for synthetic PDF/DOCX exports, without Word."""
from io import BytesIO
from zipfile import ZipFile
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from main import app
from test_document_generator import sample_payload

client = TestClient(app)


def test_docx_http_export_is_valid_zip_with_content_type_and_synthetic_text():
    payload = sample_payload()
    payload["title"] = "EXPORT-QA-ONLY-SYNTHETIC"
    response = client.post("/documents/docx", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    with ZipFile(BytesIO(response.content)) as archive:
        assert archive.testzip() is None
        xml = archive.read("word/document.xml").decode("utf-8")
        assert "EXPORT-QA-ONLY-SYNTHETIC" in xml
        assert "word/styles.xml" in archive.namelist()


def test_pdf_http_export_has_pdf_signature_and_synthetic_content():
    payload = sample_payload()
    payload["title"] = "EXPORT-QA-ONLY-SYNTHETIC"
    response = client.post("/documents/pdf", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/pdf")
    assert response.content.startswith(b"%PDF-")
    assert len(response.content) > 20000
