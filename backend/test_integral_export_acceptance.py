"""Aceptación documental integral: un único caso sintético por PDF y DOCX.

Comprueba el contenido legible, no simplemente que exista un archivo.
No usa Supabase, credenciales ni información del usuario.
"""
from io import BytesIO

from docx import Document
from pypdf import PdfReader

from backend.document_generator import generate_pdf, generate_docx
from backend.test_document_generator import sample_payload


def normalized(text):
    return " ".join(text.split())


def document_text_docx(data):
    doc = Document(BytesIO(data))
    parts = [p.text for p in doc.paragraphs]
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                parts.append(cell.text)
    return normalized(" ".join(parts))


def document_text_pdf(data):
    doc = PdfReader(BytesIO(data))
    assert len(doc.pages) >= 2, "El PDF debe contener más de una página"
    return normalized(" ".join(page.extract_text() or "" for page in doc.pages))


def test_integral_project_exports_cover_core_methodological_chain():
    payload = sample_payload()
    payload.update({
        "title": "CASO SINTETICO PARA ACEPTACION S01 A S16",
        "context": "CONTEXTO TERRITORIAL QA: descripcion sintética, sin evidencia primaria.",
        "population": "POBLACION QA: treinta participantes hipotéticos.",
        "evidence": "EVIDENCIA QA: fuentes ficticias de prueba, por verificar.",
        "problem": "PROBLEMA QA: continuidad insuficiente de espacios culturales.",
        "objective_general": "OBJETIVO GENERAL QA: mejorar la continuidad cultural.",
        "strategy": "ESTRATEGIA QA: sesiones formativas de prueba.",
        "sources": "FUENTES QA: documento institucional hipotético.",
    })
    payload["results"] = [{"id": "R-QA", "text": "RESULTADO QA: ciclo de talleres ejecutado.", "confirmed": True}]
    payload["activities"] = [{"id": "A-QA", "resultText": "RESULTADO QA", "text": "ACTIVIDAD QA: realizar seis sesiones."}]
    payload["indicators"] = [{
        "linkedType": "Actividad",
        "linkedText": "ACTIVIDAD QA",
        "indicator": "INDICADOR QA: porcentaje de sesiones.",
        "formula": "(sesiones realizadas / 6) x 100",
        "unidad": "%",
        "lineaBase": "0 %",
        "meta": "100 %",
        "periodicidad": "Mensual",
        "medioVerificacion": "Actas sintéticas",
        "responsable": "Equipo QA",
        "plazo": "Al cierre",
    }]
    payload["schedule"] = [{"activityText": "ACTIVIDAD QA", "startDate": "2026-10-01",
                            "endDate": "2026-12-01", "responsible": "Equipo QA", "frequency": "Mensual"}]
    payload["budget"] = [{"activityText": "ACTIVIDAD QA", "description": "PRESUPUESTO QA: materiales",
                          "quantity": 6, "unitCost": 10000, "totalCost": 60000,
                          "costType": "Monetario"}]
    payload["risks"] = [{"linkedObjectType": "Actividad", "event": "RIESGO QA: retrasos",
                          "riskLevel": "Medio", "preventiveResponse": "Prevenir demoras",
                          "contingencyResponse": "Ajustar cronograma", "owner": "Equipo QA"}]

    pdf = generate_pdf(payload)
    docx = generate_docx(payload)
    assert pdf.startswith(b"%PDF-") and len(pdf) > 20000
    assert docx[:2] == b"PK" and len(docx) > 20000

    required = {
        "identificación": "CASO SINTETICO PARA ACEPTACION",
        "contexto": "CONTEXTO TERRITORIAL QA",
        "población": "POBLACION QA",
        "evidencia": "EVIDENCIA QA",
        "problema": "PROBLEMA QA",
        "objetivo general": "OBJETIVO GENERAL QA",
        "estrategia": "ESTRATEGIA QA",
        "resultado": "RESULTADO QA",
        "actividad": "ACTIVIDAD QA",
        "indicador": "INDICADOR QA",
        "presupuesto": "PRESUPUESTO QA",
        "riesgo": "RIESGO QA",
        "fuentes": "FUENTES QA",
    }
    headings = [
        "1. Contexto territorial, cultural y social",
        "2. Resumen ejecutivo",
        "3. Población",
        "4. Evidencia y antecedentes",
        "5. Priorización de situaciones",
        "6. Planteamiento del problema",
        "7. Objetivos",
        "8. Estrategia de intervención",
        "9. Resultados esperados",
        "10. Plan de actividades",
        "11. Indicadores y metas",
        "12. Cronograma",
        "13. Recursos y presupuesto",
        "14. Riesgos y respuestas",
        "15. Coherencia y trazabilidad",
        "16. Fuentes y anexos",
    ]
    for fmt, data in (("PDF", pdf), ("DOCX", docx)):
        text = document_text_pdf(data) if fmt == "PDF" else document_text_docx(data)
        for section, needle in required.items():
            assert needle in text, f"{fmt}: contenido de {section} omitido del documento"
        for heading in headings:
            assert heading in text, f"{fmt}: falta el apartado '{heading}'"

