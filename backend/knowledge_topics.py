"""Versioned operational guidance; reference metadata is not live evidence.

Only match complete general questions. Local facts, current calls, legal
eligibility and arbitrary questions must continue through documentary retrieval.
"""
import re

DNP={"title":"Formulación asociada a un proyecto de inversión","publisher":"DNP / MapaInversiones","url":"https://mapainversiones.dnp.gov.co/Infografias/InfoFormulacionProyecto"}
UNESCO={"title":"Convención de 2005 sobre la diversidad de las expresiones culturales","publisher":"UNESCO","url":"https://www.unesco.org/es/legal-affairs/convention-protection-and-promotion-diversity-cultural-expressions?hub=378"}
LAW={"title":"Ley 397 de 1997","publisher":"Congreso de Colombia / Función Pública","url":"https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=337"}
# Each response is a VÉRTICE interpretation/application, not a quotation.
TOPICS=[
 (("diversidad cultural",),"Reconoce la pluralidad de prácticas y expresiones de los grupos humanos. En el proyecto, identifica qué diferencias importan para la participación, el acceso y las decisiones; documenta las condiciones específicas del territorio.",UNESCO,"Art. 4.1"),
 (("interculturalidad",),"Examina cómo se relacionan grupos con experiencias culturales distintas. Diseña condiciones para su participación equitativa, el diálogo y el reconocimiento mutuo; comprueba esas condiciones con las comunidades.",UNESCO,"Art. 4.8"),
 (("expresion cultural","expresiones culturales"),"Identifica las creaciones individuales o colectivas que comunican significados culturales. Delimita cuáles aborda tu proyecto y quiénes las desarrollan.",UNESCO,"Art. 4.3"),
 (("politica cultural","politicas culturales"),"Relaciona las decisiones públicas que inciden en la vida cultural con el propósito del proyecto. Consulta el instrumento aplicable, su ámbito y vigencia antes de afirmar que el proyecto cumple sus disposiciones.",UNESCO,"Art. 4.6"),
 (("gestion cultural",),"Organiza decisiones, relaciones, recursos y procesos para concretar una iniciativa cultural. Empieza por su propósito, participantes, contexto y condiciones de ejecución. Esta es una definición operativa de VÉRTICE, no una definición legal.",None,None),
 (("proyecto cultural",),"Delimita una iniciativa que busca realizar un cambio o producir un resultado cultural mediante actividades, recursos, plazos y responsabilidades. Formula el propósito y establece cómo revisarás su cumplimiento.",None,None),
 (("problema","problema central","arbol de problemas"),"Describe una situación que requiere atención, con población, territorio y evidencia. Distingue las posibles causas de sus consecuencias. Si una relación causal es hipotética, mantenla como tal hasta contrastarla.",DNP,"Identificación de la problemática"),
 (("objetivo","objetivo general","arbol de objetivos"),"Expresa el cambio esperado frente al problema priorizado. Delimita el objeto del cambio y su alcance; comprueba que pueda evaluarse y que las actividades contribuyan a alcanzarlo.",DNP,"Situación deseada"),
 (("objetivo especifico","objetivos especificos"),"Desglosa el propósito general en cambios parciales vinculados con las causas que se pretende abordar. Evita confundirlos con las tareas que se ejecutarán.",DNP,"Árbol de objetivos"),
 (("poblacion afectada",),"Identifica el grupo al que concierne la situación problemática. Registra criterios de delimitación y datos disponibles; una cifra general de habitantes no basta para estimarla.",DNP,"Población afectada y atendida"),
 (("poblacion objetivo","poblacion participante","beneficiarios"),"Delimita las personas a quienes se dirige efectivamente la iniciativa. La cobertura prevista debe ser coherente con los criterios de participación y los recursos disponibles.",DNP,"Población afectada y atendida"),
 (("alternativa","alternativas","alternativa de solucion","alternativas de solucion"),"Compara opciones para alcanzar los objetivos. Explicita criterios como pertinencia, viabilidad, recursos y restricciones antes de elegir una opción.",DNP,"Alternativas de solución"),
 (("evidencia","evidencia documental"),"Identifica qué afirmación quieres respaldar y qué documento, observación o dato permite examinarla. Conserva fecha, procedencia y alcance. Una hipótesis o una propuesta generativa no constituye evidencia primaria.",None,None),
 (("linea base",),"Registra la situación inicial antes de la intervención. Define la variable, unidad, fecha y fuente. Si el dato inicial no existe, programa su medición; no lo sustituyas por cero.",None,None),
 (("medio de verificacion","medios de verificacion"),"Define el registro que permitirá comprobar un indicador: por ejemplo, un acta, listado de asistencia o producto documentado. Establece responsable, frecuencia y criterios de calidad del registro.",None,None),
 (("presupuesto",),"Desglosa recursos por actividad, unidad, cantidad, frecuencia y tarifa. Identifica la fuente y fecha del precio, distingue aportes en especie y desembolsos y conserva los valores faltantes como pendientes.",None,None),
 (("riesgo","riesgos","matriz de riesgos"),"Identifica sucesos inciertos que podrían afectar el proyecto, sus causas y posibles consecuencias. Asigna responsables, medidas preventivas y respuestas de contingencia. No confundas riesgo con problema ya observado.",None,None),
 (("convocatoria","convocatorias"),"Consulta los términos oficiales de la oportunidad específica: requisitos, fechas, gastos elegibles, criterios de evaluación y anexos. Sin esos documentos no es posible afirmar admisibilidad.",None,None),
]
LOOKUP={alias:(answer,ref,locator) for aliases,answer,ref,locator in TOPICS for alias in aliases}
PREFIX=re.compile(r"^(?:que es|que son|que significa|definicion de|concepto de|explicame|para que sirve|para que sirven|como definir|como se define|como formular|como se formula) (?:(?:el|la|los|las|un|una|unos|unas) )?")
ARTICLE=re.compile(r"^(?:el|la|los|las|un|una) ")
def resolve_topic(key):
    # Remove only an explicit general-question wrapper, never a territorial or factual suffix.
    name=ARTICLE.sub("",PREFIX.sub("",key,count=1),count=1)
    return LOOKUP.get(name)

def general_answer(key):
    match=resolve_topic(key)
    if match:
        answer,ref,locator=match
        return answer,[{**ref,"locator":locator}] if ref else []
    # Explicit comparison, both sides must resolve to known, distinct concepts.
    m=re.fullmatch(r"(?:cual es la diferencia entre|que diferencia hay entre|diferencia entre|diferencias entre) (.+?) y (.+)",key)
    if not m: return None
    left=resolve_topic(m[1]);right=resolve_topic(m[2])
    if not left or not right or left==right: return None
    refs=[]
    for answer,ref,locator in (left,right):
        if ref and {**ref,"locator":locator} not in refs: refs.append({**ref,"locator":locator})
    return m[1].capitalize()+": "+left[0]+"\n\n"+m[2].capitalize()+": "+right[0],refs
