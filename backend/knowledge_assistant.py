"""VKE methodology consultation. Explicit public query, no project context.

Deterministic guidance uses the project's operational rules. Documentary retrieval
uses only the operator-approved local corpus. No silent generative fallback.
"""
from functools import lru_cache
import json
import logging
import os
from pathlib import Path
import re
import unicodedata
from pydantic import BaseModel, Field
from assistant_pilot import verified_user
from knowledge_index import KnowledgeIndex
from knowledge_topics import general_answer
from prompt_boundary import contains_directive

logger = logging.getLogger("vertice.knowledge")
MAX_MANIFEST_BYTES = 5_000_000

class KnowledgeRequest(BaseModel):
    section: str = Field(pattern=r"^S(0[1-9]|1[0-6])$")
    question: str = Field(min_length=2,max_length=400)

def normalize(q):
    q = unicodedata.normalize("NFKD",q.casefold())
    q = "".join(c for c in q if not unicodedata.combining(c))
    return " ".join(re.findall(r"[a-z0-9]+",q))

# Operational guidance, not external documentary evidence. Exact aliases avoid
# treating a similar factual or context-specific question as a general definition.
RULES = [
    (("que es un indicador","que es indicador","indicador"),
     "Define qué se medirá, con qué unidad, fórmula o criterio, línea base, meta, plazo, responsable y medio de verificación. Vincúlalo con un resultado o actividad vigente."),
    (("como calcular el presupuesto","como se calcula el presupuesto","calculo presupuesto"),
     "Para cada recurso, multiplica cantidad por frecuencia por costo unitario. Separa desembolsos monetarios y aportes en especie; conserva los costos desconocidos como pendientes."),
    (("que es la matriz de vester","que es vester","matriz de vester"),
     "Valora cada dirección de influencia entre situaciones mediante una escala de 0 a 3. Las sumas de influencia y dependencia orientan la priorización; las puntuaciones son juicios humanos y no demuestran causalidad."),
    (("que es una actividad","actividad","que es un resultado","resultado"),
     "Un resultado describe el producto o logro comprobable. Una actividad identifica una acción necesaria para alcanzarlo. Registra la relación explícita entre ambos."),
    (("que es una meta","meta","que es linea base"),
     "La línea base registra la situación inicial y la meta el valor que se espera alcanzar en un plazo. Si falta respaldo para un valor, conserva [POR VERIFICAR]."),
    (("como revisar el cronograma","cronograma"),
     "Registra fechas de inicio y cierre, responsables y dependencias entre actividades. Comprueba que las fechas sean válidas, que las dependencias existan y que no formen ciclos."),
    (("proyecto listo para presentar","cuando puedo presentar el proyecto","admisibilidad"),
     "La revisión del proyecto maestro requiere aprobación humana vigente. Para presentarlo a una convocatoria debes comprobar sus términos específicos, requisitos habilitantes, fechas, anexos y elegibilidad.")
]
LOCAL = {alias: answer for aliases,answer in RULES for alias in aliases}

# Editorial summaries checked against named public sources. These are not
# retrieved passages, curator-approved corpus entries, or model generations.
CONCEPTS = (
    (("cultura","que es cultura","que es la cultura","definicion de cultura","concepto de cultura"),
     "La cultura comprende las expresiones, formas de vida, valores, conocimientos y creencias que caracterizan a los grupos humanos. En un proyecto cultural conviene identificar qué prácticas existen, quiénes participan, cómo se transmiten y qué condiciones permiten su desarrollo. Las características de un municipio requieren investigación territorial específica.",
     [{"title":"Ley 397 de 1997","publisher":"Congreso de Colombia","locator":"Artículo 1, numeral 1","url":"https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=337"},
      {"title":"El Sector de la Cultura","publisher":"UNESCO","locator":"Referencia a la Declaración de México de 1982","url":"https://www.unesco.org/es/culture/about"}]),
)
CONCEPT_LOOKUP = {alias:(answer,refs) for aliases,answer,refs in CONCEPTS for alias in aliases}


@lru_cache(maxsize=1)
def load_index():
    # The manifest is an operator configuration, never a user-supplied path.
    name=os.getenv("VERTICE_KNOWLEDGE_MANIFEST","").strip()
    if not name:
        return KnowledgeIndex([])
    try:
        with Path(name).open("rb") as f:
            raw=f.read(MAX_MANIFEST_BYTES+1)
        if len(raw)>MAX_MANIFEST_BYTES:
            raise ValueError("manifest exceeds bound")
        records=json.loads(raw)
        if not isinstance(records,list) or any(not isinstance(r,dict) for r in records):
            raise ValueError("invalid manifest")
        return KnowledgeIndex(records)
    except (OSError,ValueError,TypeError):
        logger.warning("knowledge_manifest_unavailable")
        return KnowledgeIndex([])

def route_knowledge(req,index):
    base={"section":req.section,"corpus_version":index.version,
          "generation_used":False,"requires_approval":True,"passages":[]}
    if contains_directive(req.question):
        return {**base,"route":"ABSTAIN","status":"INSUFFICIENT_EVIDENCE",
                "answer":"La consulta debe reformularse como pregunta metodológica."}
    key=normalize(req.question)
    if key in LOCAL:
        return {**base,"route":"DETERMINISTIC_GUIDANCE","status":"OPERATIONAL_RULE",
                "answer":LOCAL[key],"source":"Regla operativa VÉRTICE, no evidencia externa."}
    if key in CONCEPT_LOOKUP:
        answer,refs=CONCEPT_LOOKUP[key]
        return {**base,"route":"REFERENCED_GUIDANCE","status":"EDITORIAL_SUMMARY_REVIEW_REQUIRED","answer":answer,"source":"Síntesis editorial con referencias identificadas; no equivale a recuperación documental en tiempo real.","references":refs}
    general=general_answer(key)
    if general:
        answer,refs=general
        return {**base,"route":"REFERENCED_GUIDANCE" if refs else "DETERMINISTIC_GUIDANCE",
                "status":"EDITORIAL_SUMMARY_REVIEW_REQUIRED" if refs else "OPERATIONAL_RULE",
                "answer":answer,"source":("Orientación editorial de VÉRTICE con referencias identificadas; no es recuperación en tiempo real." if refs else "Orientación operativa VÉRTICE, no evidencia externa."),
                "references":refs}
    result=index.retrieve(req.question)
    if result["passages"]:
        # Curator identity is not necessary for the learner's consultation.
        passages=[{k:v for k,v in p.items() if k!="reviewed_by"} for p in result["passages"]]
        return {**base,"route":"DOCUMENT_RETRIEVAL","status":result["status"],
                "passages":passages,
                "answer":"Fragmentos documentales pertinentes por coincidencia léxica. Comprueba su alcance y contexto en la fuente original."}
    return {**base,"route":"ABSTAIN","status":"INSUFFICIENT_EVIDENCE",
            "answer":"No encontramos respaldo suficiente para responder esta consulta. Puedes precisar el concepto que quieres comprender, por ejemplo: cultura, indicador, matriz de Vester o cronograma. Si buscas datos de un municipio, utiliza la investigación del campo correspondiente. Tu proyecto puede continuar con esta consulta pendiente."}

async def answer_knowledge(req,bearer):
    await verified_user(bearer)
    return route_knowledge(req,load_index())
