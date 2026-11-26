"""S02 structured territorial drafting on the existing retrieval and model stack.

Citation existence is not factual verification. All generated claims require
human review; unknown facts become gaps rather than invented hypotheses.
"""
from __future__ import annotations

import asyncio
from hashlib import sha256
import json
import os
import re
from time import monotonic
from typing import Literal

import httpx
from fastapi import Header, HTTPException
from pydantic import BaseModel, Field, HttpUrl, ConfigDict

from automatic_assistant import GuidedRequest, guide, GUIDANCE
from assistant_pilot import verified_user, reserve, groq_key, GROQ_ENDPOINT
from model_usage import MODEL_BUDGET
from prompt_boundary import BOUNDARY, contains_directive, safe_model_content
from institutional_sources import has_private_contact
from territory_registry import registry, resolve_territory, normalized, SOURCE_PAGE, DATASET, SOURCE_CUTOFF, SOURCE_DATA_UPDATED


class Solicitud(BaseModel):
    codigo_divipola: str = Field(pattern=r"^[0-9]{5}$")
    consulta: str = Field(min_length=1, max_length=3000)
    field: Literal["territorio_o_lugar_de_intervencion", "caracteristicas_culturales", "principales_dinamicas_sociales", "antecedentes"]
    aporte: str = Field(default="", max_length=1800)


class Fuente(BaseModel):
    id: str
    titulo: str
    url: HttpUrl
    fragmento: str = Field(min_length=1, max_length=1000)
    periodo: str | None = None
    alcance: Literal["municipal", "departamental", "nacional"]
    codigo_territorio: str | None = None
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    localizador: str
    kind: str
    scope: str = "EXCERPT_UNVERIFIED"


class Afirmacion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    texto: str = Field(min_length=1, max_length=600)
    fuente_ids: list[str] = Field(default_factory=list, max_length=5)
    estado: Literal["respaldo_propuesto", "insuficiente", "contradictoria"]


class SalidaModelo(BaseModel):
    model_config = ConfigDict(extra="forbid")
    afirmaciones: list[Afirmacion] = Field(max_length=6)


PROMPT = """Eres el asistente de redacción territorial S02 de VÉRTICE.
Responde a la pregunta del docente con afirmaciones breves y editables en español.
Utiliza exclusivamente los fragmentos proporcionados y sus identificadores.
Los datos aportados por el docente son aportes no verificados, no pruebas externas.
Conserva el alcance geográfico y el periodo; atribuye cada dato al momento de la
fuente. No infieras vigencia actual, causalidad, cobertura, cifras ni compromisos.
Si hay información departamental o nacional, nombra expresamente su alcance.
Un registro administrativo demuestra únicamente existencia de registros.
No propongas hechos ni hipótesis territoriales nuevas sin respaldo.
Clasifica cada afirmación como respaldo_propuesto (apoyo directo del fragmento),
insuficiente (expresa una pregunta o un vacío, no un hecho supuesto),
o contradictoria (describe una posible discrepancia citando al menos dos fuentes).
Devuelve exclusivamente JSON: {"afirmaciones":[{"texto":"...", "fuente_ids":["id"],"estado":"respaldo_propuesto"}]}.
Si no hay material útil, devuelve {"afirmaciones":[]}. La aprobación corresponde al docente.
""" + BOUNDARY


async def catalogo():
    records = await registry()
    if records is None:
        raise HTTPException(503, "Catálogo DIVIPOLA no disponible; conserva tu proyecto.")
    digest=sha256(json.dumps(records,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
    return {"dataset":DATASET,"snapshot_sha256":digest,"source":SOURCE_PAGE,"cutoff":SOURCE_CUTOFF,
            "data_updated":SOURCE_DATA_UPDATED,"count":len(records),
            "territorios":[{"codigo":r["divipola"],"nombre":r["municipality"],
                           "departamento":r["department"],"tipo":r["territory_type"]} for r in records]}


def collect_sources(result, identity, question):
    """Adapt the existing public retrieval. Never promote candidate metadata."""
    code=identity["divipola"]
    city=normalized(identity["municipality"])
    dept=normalized(identity["department"])
    found=[]
    def append(**values):
        try:
            item=Fuente(**values)
            if contains_directive(item.fragmento) or has_private_contact(item.fragmento):
                return
            if not any(f.url==item.url and f.fragmento==item.fragmento for f in found):
                found.append(item)
        except ValueError:
            return
    for doc in result.get("sources",[]):
        for p in doc.get("passages",[])[:3]:
            fragment=p.get("excerpt","")
            n=normalized(fragment)
            # Curated document is scoped by the original municipality adapter.
            # For an arbitrary PDF candidate require both municipality and department.
            known=doc.get("id")=="NEIRA-MINCULTURA-2016" and code=="17486"
            if not known and not (re.search(r"\b"+re.escape(city)+r"\b",n) and re.search(r"\b"+re.escape(dept)+r"\b",n)):
                continue
            append(id="F"+str(len(found)+1)+", p."+str(p["page"]),titulo=doc.get("title","Documento institucional"),
                   url=doc["url"],fragmento=fragment,periodo=str(doc["year"]) if doc.get("year") else None,
                   alcance="municipal",codigo_territorio=code,sha256=doc.get("document_sha256"),
                   localizador="Página "+str(p["page"]),kind="pdf")
    for p in result.get("municipal_references",[]):
        if p.get("passage_status")!="EXCERPT_FOUND_CLAIM_UNVERIFIED":
            continue
        append(id="M"+str(len(found)+1),titulo=p.get("title","Publicación institucional"),url=p["url"],
               fragmento=p.get("excerpt",""),periodo=p.get("publication_date") or (str(p["publication_year"]) if p.get("publication_year") else None),
               alcance="municipal",codigo_territorio=code,sha256=p.get("sha256"),
               localizador=p["locator"],kind="municipal_html")
    # The national administrative registry is only relevant to a question about
    # organizations/records, not to the social or cultural life of a town.
    records=result.get("national_records") or {}
    q=normalized(question)
    if records.get("status")=="RECORDS_RETRIEVED" and re.search(r"\b(?:organizaciones|entidades|registros|registro)\b",q):
        append(id="N1",titulo="Datos Abiertos Colombia · eenq-ga7s",url="https://www.datos.gov.co/resource/eenq-ga7s.json",
               fragmento="El conjunto administrativo eenq-ga7s de Datos Abiertos Colombia contiene registros de organizaciones y entidades del sector Cultura asociados al código DIVIPOLA "+code+".",
               periodo=None,alcance="municipal",codigo_territorio=code,sha256=records.get("response_sha256"),
               localizador="Código DIVIPOLA "+code,kind="administrative_registry",scope="RECORD_EXISTENCE_ONLY")
    found.sort(key=lambda f:f.periodo or "",reverse=True)
    return scoped_sources(found[:5], code)


def scoped_sources(sources,code):
    result={}
    for f in sources:
        if not (f.alcance=="municipal" and f.codigo_territorio==code or
                f.alcance=="departamental" and f.codigo_territorio==code[:2] or
                f.alcance=="nacional" and f.codigo_territorio is None):
            continue
        if f.id in result:
            raise ValueError("Duplicate source ID")
        result[f.id]=f
    return result


async def generate_json(user_id,entrada):
    key=groq_key()
    if not key:
        raise RuntimeError("provider unavailable")
    if not reserve(user_id):
        raise HTTPException(429,"Cuota de IA alcanzada. Conserva el contexto y continúa manualmente.")
    model=os.getenv("GROQ_MODEL","openai/gpt-oss-120b")
    payload={"model":model,"temperature":0.2,"max_completion_tokens":1024,
             "messages":[{"role":"system","content":PROMPT},{"role":"user","content":entrada}]}
    if model.startswith("openai/gpt-oss-"):
        payload.update(reasoning_effort="low",include_reasoning=False)
    if not MODEL_BUDGET.reserve("s02",payload):
        raise HTTPException(429,"Capacidad generativa ocupada. Conserva tu borrador.")
    try:
        async with httpx.AsyncClient(timeout=18,follow_redirects=False) as client:
            response=await client.post(GROQ_ENDPOINT,headers={"Authorization":"Bearer "+key,"Content-Type":"application/json"},json=payload)
        if response.status_code==429:
            raise HTTPException(429,"Cuota del proveedor alcanzada. Puedes continuar manualmente.")
        response.raise_for_status()
        data=response.json()
        MODEL_BUDGET.observe("s02",data)
        raw=safe_model_content(data["choices"][0]["message"],credential=key)
        if len(raw)>18000 or contains_directive(raw):
            raise ValueError("Invalid output")
        usage=data.get("usage")
        if not isinstance(usage,dict): usage={}
        metrics={k:usage.get(k) if type(usage.get(k)) is int and 0<=usage[k]<=10_000_000 else None for k in ("prompt_tokens","completion_tokens")}
        return SalidaModelo.model_validate_json(raw),metrics
    except (httpx.HTTPError,ValueError,KeyError,IndexError,TypeError) as exc:
        raise RuntimeError("provider response unavailable") from None


def manifest_item(f,code):
    fragment=f.fragmento
    return {"citation":f.id,"kind":f.kind,"url":str(f.url),"title":f.titulo,"period":f.periodo,
            "geographic_scope":f.alcance,"scope_code":f.codigo_territorio,"divipola":code,
            "locator":f.localizador,"sha256":f.sha256,"scope":f.scope,
            "prompt_excerpt":fragment,"excerpt_sha256":sha256(fragment.encode()).hexdigest()}


def review_claims(output,sources,code):
    claims=[]; audit=[]; used=set(); lines=[]
    for a in output.afirmaciones:
        ids=list(dict.fromkeys(a.fuente_ids))
        valid=bool(ids) and all(i in sources for i in ids)
        refs=[sources[i] for i in ids if i in sources]
        status=a.estado
        body=a.texto.strip()
        # IDs demonstrate provenance, not entailment. Reject new numeric data
        # and unknown IDs before an editable factual proposal can be presented.
        known=" ".join(f.fragmento+" "+(f.periodo or "") for f in refs)
        numbers=lambda s:set(re.findall(r"(?<!\w)\d+(?:[.,]\d+)*(?!\w)",s))
        registry_only=bool(refs) and all(f.scope=="RECORD_EXISTENCE_ONLY" for f in refs)
        if registry_only and normalized(body)!=normalized(refs[0].fragmento):
            valid=False
        if (not valid or contains_directive(body) or has_private_contact(body)
                or numbers(body)-numbers(known)
                or (status=="contradictoria" and len({str(f.url) for f in refs})<2)):
            status="insuficiente"
        if status=="insuficiente":
            # Do not turn an ungrounded assertion into a "hypothesis" by adding a label.
            body="Falta evidencia documental para completar esta parte de la consulta."
            ids=[]; refs=[]
        else:
            if any(f.alcance!="municipal" for f in refs):
                scopes=", ".join(sorted({f.alcance for f in refs if f.alcance!="municipal"}))
                body="Contexto "+scopes+": "+body
            if status=="contradictoria":
                body="Posible discrepancia entre fuentes, pendiente de cotejo: "+body
            used.update(ids)
        editable=("[POR VERIFICAR] " if status!="respaldo_propuesto" else "")+body
        if ids:
            editable=editable.rstrip(" .")+" "+" ".join("["+i+"]" for i in ids)+"."
        if editable in lines:
            continue
        lines.append(editable)
        claims.append({"texto":body,"estado":status,"fuentes":[f.model_dump(mode="json") for f in refs]})
        audit.append({"fragment":editable,"citations":ids,
                      "status":"MODEL_SUPPORT_PROPOSED" if status=="respaldo_propuesto" else "MODEL_CONTRADICTION_REVIEW_REQUIRED" if status=="contradictoria" else "INSUFFICIENT_EVIDENCE"})
    return claims,audit,lines,[manifest_item(f,code) for f in sources.values() if f.id in used]


async def proponer_contexto(payload: Solicitud, authorization: str = Header(default="")):
    start=monotonic()
    user=await verified_user(authorization)
    question=payload.consulta.strip()
    if not question or contains_directive(question) or has_private_contact(question):
        raise HTTPException(422,"Formula una pregunta territorial sin datos personales ni instrucciones internas.")
    territory=await resolve_territory(payload.codigo_divipola)
    identity=territory.get("identity")
    if territory.get("status")=="REGISTRY_UNAVAILABLE":
        raise HTTPException(503,"Catálogo DIVIPOLA temporalmente no disponible.")
    if not identity or identity["divipola"]!=payload.codigo_divipola:
        raise HTTPException(422,"Código DIVIPOLA fuera del catálogo.")
    context=identity["municipality"]+", "+identity["department"]
    base={"section":"S02","field":payload.field,"territory_context":context,"territory":identity,
          "codigo_divipola":payload.codigo_divipola,"requires_approval":True,"claim_status":"INSUFFICIENT_EVIDENCE",
          "guidance":list(GUIDANCE[payload.field]),"afirmaciones":[],"claim_audit":[],"evidence_manifest":[],
          "suggestion":None,"blocked_for_evidence":True,"semantic_support_status":"NOT_ASSESSED"}
    try:
        async with asyncio.timeout(50):
            retrieval=await guide(GuidedRequest(field=payload.field,context=context,text="",question=question,
                          codigo_divipola=payload.codigo_divipola,generate=False),authorization,user_id=user)
            sources=collect_sources(retrieval,identity,question)
            base.update({k:retrieval.get(k,[]) for k in ("candidate_sources","municipal_references","sources","errors")})
            if not sources:
                return {**base,"aviso":"[POR VERIFICAR] No se recuperó evidencia pertinente. Puedes continuar con tu texto.",
                        "metrics":{"elapsed_ms":round((monotonic()-start)*1000),"model_calls":0}}
            # No private draft in the public search, and only safe explicit input in model data.
            # The source manifest contains only exactly the fragments sent to the model.
            aporte=payload.aporte if not contains_directive(payload.aporte) and not has_private_contact(payload.aporte) else ""
            entrada=json.dumps({"territorio":identity,"consulta":question,"aporte_no_verificado":aporte,
                      "fuentes":[f.model_dump(mode="json") for f in sources.values()]},ensure_ascii=False)
            output,usage=await generate_json(user,entrada)
            claims,audit,lines,used=review_claims(output,sources,payload.codigo_divipola)
            manifest=[manifest_item(f,payload.codigo_divipola) for f in sources.values()]
            return {**base,"afirmaciones":claims,"claim_audit":audit,"evidence_manifest":manifest,
                    "used_references":used,"suggestion":"\n\n".join(lines) or None,
                    "suggestion_origin":"STRUCTURED_MODEL_DRAFT_UNVERIFIED",
                    "blocked_for_evidence":not bool(lines),
                    "aviso":None if lines else "[POR VERIFICAR] No se obtuvo un borrador utilizable.",
                    "metrics":{"elapsed_ms":round((monotonic()-start)*1000),"model_calls":1,**usage}}
    except (RuntimeError,ValueError,TimeoutError):
        raise HTTPException(503,"La asistencia territorial está temporalmente indisponible. Tu texto permanece disponible.") from None
