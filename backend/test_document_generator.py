from io import BytesIO
from zipfile import ZipFile

from backend.document_generator import DOC_FOOTER, _sentence_chunks, _tree_figure, _wrap_node_text, generate_docx, generate_pdf


def sample_payload():
    return {
        "title": "Proyecto de prueba",
        "entity": "Entidad de prueba",
        "territory": "Territorio de prueba",
        "responsible": "Paulo Olarte",
        "summary": "Resumen verificable del proyecto.",
        "context": "Contexto territorial del proyecto.",
        "population": "Población participante.",
        "evidence": "Evidencia confirmada.",
        "sources": "Fuente institucional.",
        "problem": "Problema central.",
        "objective_general": "Mejorar la condición central.",
        "objectives": [{"text": "Objetivo específico uno."}],
        "strategy": "Estrategia seleccionada.",
        "results": [{"text": "Resultado esperado uno."}],
        "activities": [{"id": "A1", "resultText": "Resultado esperado uno.", "text": "Realizar seis talleres."}],
        "indicators": [{
            "linkedType": "Actividad",
            "linkedText": "Realizar seis talleres.",
            "indicator": "Porcentaje de talleres realizados.",
            "formula": "(talleres realizados / 6) × 100",
            "unidad": "%",
            "lineaBase": "0 %",
            "meta": "100 %",
            "periodicidad": "Al cierre de cada taller",
            "medioVerificacion": "Actas y listas de asistencia",
            "responsable": "Coordinación",
            "plazo": "Al cierre",
        }],
        "schedule": [{
            "activityText": "Realizar seis talleres.",
            "startDate": "2026-10-01",
            "endDate": "2026-12-15",
            "responsible": "Coordinación",
            "frequency": "Mensual",
        }],
        "budget": [{
            "activityText": "Realizar seis talleres.",
            "description": "Honorarios",
            "unit": "taller",
            "quantity": 6,
            "frequency": 1,
            "unitCost": 500000,
            "totalCost": 3000000,
            "costType": "Monetario",
        }],
        "risks": [{
            "linkedObjectType": "Actividad",
            "event": "Retraso documental",
            "probability": "Media",
            "impact": "Alto",
            "riskLevel": "Alto",
            "preventiveResponse": "Solicitar documentos con antelación.",
            "contingencyResponse": "Reprogramar como último recurso.",
            "owner": "Coordinación",
        }],
        "problem_tree": [
            {"id": "e1", "zone": "direct_effect", "text": "Efecto", "parentId": "c"},
            {"id": "c", "zone": "central", "text": "Problema central"},
            {"id": "d1", "zone": "direct_cause", "text": "Causa directa", "parentId": "c"},
            {"id": "i1", "zone": "indirect_cause", "text": "Causa indirecta", "parentId": "d1"},
        ],
        "objective_tree": [
            {"id": "f1", "zone": "direct_effect", "text": "Incrementar la participación de la banda en espacios de circulación musical.", "parentId": "oc"},
            {"id": "oc", "zone": "central", "text": "Incrementar la participación de la banda en certámenes musicales de mayor exigencia interpretativa."},
            {"id": "m1", "zone": "direct_cause", "text": "Ampliar el acceso a talleres especializados para algunas familias instrumentales.", "parentId": "oc"},
            {"id": "m2", "zone": "direct_cause", "text": "Reducir las diferencias en los niveles de dominio instrumental entre integrantes de una misma sección de la banda.", "parentId": "oc"},
        ],
        "vester": {
            "rows": [
                {"text": "P1", "influence": 3, "dependence": 1, "quadrant": "Activo"},
                {"text": "P2", "influence": 1, "dependence": 3, "quadrant": "Pasivo"},
            ],
            "meanInfluence": 2,
            "meanDependence": 2,
        },
        "coherence": {"score": 92, "summary": "La cadena principal está conectada."},
    }


def test_docx_has_all_sections_footer_and_graphics():
    data = generate_docx(sample_payload())
    assert data[:2] == b"PK"
    with ZipFile(BytesIO(data)) as z:
        names = z.namelist()
        xml = z.read("word/document.xml").decode("utf-8")
        footer = z.read("word/footer1.xml").decode("utf-8")
        assert DOC_FOOTER in footer
        assert "1. Resumen ejecutivo" in xml
        assert "5. Priorización de situaciones" in xml
        assert "11. Indicadores y metas" in xml
        assert "12. Cronograma" in xml
        assert "13. Recursos y presupuesto" in xml
        assert "13.1 Soportes de recursos" in xml
        assert "11.2 Fichas técnicas de indicadores" in xml
        assert "Recurso:" in xml
        assert "16. Fuentes y anexos" in xml
        media = [n for n in names if n.startswith("word/media/")]
        assert len(media) >= 5


def test_pdf_is_nonempty_and_contains_multiple_pages():
    data = generate_pdf(sample_payload())
    assert data.startswith(b"%PDF")
    assert len(data) > 20000
    assert data.count(b"/Type /Page") >= 5


def test_tree_wraps_long_labels_without_single_line_overflow(tmp_path):
    text = "Reducir las diferencias en los niveles de dominio instrumental entre integrantes de una misma sección de la banda."
    wrapped = _wrap_node_text(text, width=34)
    assert "\n" in wrapped
    assert max(len(line) for line in wrapped.splitlines()) <= 45

    nodes = [
        {"id": "c", "zone": "central", "text": "Incrementar la participación de la banda en certámenes musicales de mayor exigencia interpretativa."},
        {"id": "m1", "zone": "direct_cause", "text": "Ampliar el acceso a talleres especializados para algunas familias instrumentales.", "parentId": "c"},
        {"id": "m2", "zone": "direct_cause", "text": text, "parentId": "c"},
    ]
    target = tmp_path / "tree.png"
    result = _tree_figure(nodes, "Árbol de objetivos", target)
    assert result == target
    assert target.exists()
    assert target.stat().st_size > 10000


def test_editorial_paragraph_chunks_limit_sentence_density():
    text = "Uno. Dos. Tres. Cuatro. Cinco. Seis. Siete. Ocho. Nueve."
    chunks = _sentence_chunks(text, 4)
    assert len(chunks) == 3
    assert all(part.count(".") <= 4 for part in chunks)


def test_long_content_exports_without_table_overflow_failure():
    payload = sample_payload()
    payload["context"] = " ".join([
        "La primera frase desarrolla el contexto territorial.",
        "La segunda frase añade una condición cultural relevante.",
        "La tercera frase precisa una relación institucional.",
        "La cuarta frase delimita el alcance de la observación.",
        "La quinta frase incorpora un dato complementario.",
        "La sexta frase amplía el análisis.",
        "La séptima frase registra otra condición.",
        "La octava frase cierra la unidad argumental.",
    ])
    payload["activities"][0]["text"] = "Actividad extensa " * 30
    payload["indicators"][0]["formula"] = "Criterio técnico extenso " * 18
    payload["budget"][0]["fundingSource"] = "Institución educativa y aliado territorial"
    docx = generate_docx(payload)
    pdf = generate_pdf(payload)
    assert docx[:2] == b"PK"
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 20000
