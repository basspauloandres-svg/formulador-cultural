"""Offline call-specific preflight, not a certificate of eligibility.

A curator must transcribe official terms and attest their version, scope and
evidence. This module never selects a real call, downloads sources, or submits
a project. Caller-provided checklist entries are declarations, not independent
verification. A successful preflight is always subject to human review.
"""
from datetime import date
from decimal import Decimal, InvalidOperation
import re
from urllib.parse import urlsplit

def day(value):
    if not isinstance(value,str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}",value):
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None

def amount(value):
    if isinstance(value,bool) or value is None or not isinstance(value,(int,float,str)):
        return None
    try:
        v=Decimal(str(value))
    except InvalidOperation:
        return None
    return v if v.is_finite() and v>=0 else None

def text(value):
    return isinstance(value,str) and bool(value.strip())

def provenance(value):
    if not isinstance(value,dict) or not all(text(value.get(k)) for k in ("url","locator","sha256")):
        return False
    try:
        url=urlsplit(value["url"])
        return (url.scheme=="https" and bool(url.hostname) and not url.username
                and not url.password and url.port in (443,None)
                and bool(re.fullmatch(r"[a-f0-9]{64}",value["sha256"])))
    except ValueError:
        return False

def valid_profile(p):
    if not isinstance(p,dict) or p.get("status")!="CURATOR_APPROVED":
        return False
    if not all(text(p.get(k)) for k in ("id","version","issuer","title","currency")):
        return False
    if not provenance(p.get("terms")) or not day(p.get("opens")) or not day(p.get("closes")):
        return False
    if day(p["opens"])>day(p["closes"]) or amount(p.get("max_requested")) is None:
        return False
    # Empty requirements and annexes may be legitimate only if explicitly
    # represented by reviewed lists. Evaluation criteria must be present.
    for k in ("requirements","annexes","eligible_categories","evaluation_criteria"):
        rows=p.get(k)
        if not isinstance(rows,list) or (k in ("eligible_categories","evaluation_criteria") and not rows):
            return False
        if any(not isinstance(r,dict) or not text(r.get("id")) or not text(r.get("label"))
               or not provenance(r.get("source")) for r in rows):
            return False
        if len(set(r["id"] for r in rows))!=len(rows):
            return False
    return True

def preflight(profile,project,as_of):
    result={"status":"INSUFFICIENT_EVIDENCE","ready_to_submit":False,"issues":[],
            "checks":[],"note":"Cotejo preliminar de declaraciones; requiere revisión humana y términos oficiales."}
    if not valid_profile(profile):
        result["issues"].append("PROFILE_MISSING_OR_INVALID")
        return result
    result.update(profile_id=profile["id"],profile_version=profile["version"])
    if not isinstance(project,dict) or not day(as_of):
        result["issues"].append("PROJECT_OR_DATE_MISSING")
        return result
    checks=result["checks"]
    def check(key,status):
        checks.append({"id":key,"status":status})
    check("CALL_WINDOW","MET" if day(profile["opens"])<=day(as_of)<=day(profile["closes"]) else "NOT_MET")
    check("CURRENCY","UNKNOWN" if not text(project.get("currency")) else "MET" if project["currency"]==profile["currency"] else "NOT_MET")
    requested=amount(project.get("requested_amount"))
    check("FUNDING_CAP","UNKNOWN" if requested is None else "MET" if requested<=amount(profile["max_requested"]) else "NOT_MET")
    allowed={r["id"] for r in profile["eligible_categories"]}
    costs=project.get("requested_costs")
    if not isinstance(costs,list):
        check("REQUESTED_COSTS","UNKNOWN")
    else:
        totals=[]
        for i,row in enumerate(costs):
            if not isinstance(row,dict):
                check("COST:"+str(i),"UNKNOWN")
                continue
            v=amount(row.get("amount"))
            category=row.get("category")
            totals.append(v)
            check("COST:"+str(i),"UNKNOWN" if v is None or not text(category) else "MET" if category in allowed else "NOT_MET")
        check("RECONCILIATION","UNKNOWN" if requested is None or any(v is None for v in totals) or len(totals)!=len(costs) else "MET" if sum(totals,Decimal(0))==requested else "NOT_MET")
    for group in ("requirements","annexes"):
        declared=project.get(group,{})
        if not isinstance(declared,dict):
            declared={}
        for rule in profile[group]:
            entry=declared.get(rule["id"])
            status="UNKNOWN"
            if isinstance(entry,dict) and entry.get("status") in ("MET","NOT_MET") and text(entry.get("reference")):
                status=entry["status"]
            check(group+":"+rule["id"],status)
    check("MASTER_REVIEW","MET" if project.get("master_review_current") is True else "UNKNOWN")
    # Evaluation criteria remain for human scoring, never inferred from eligibility.
    result["evaluation_criteria"]=profile["evaluation_criteria"]
    result["issues"]=[c["id"] for c in checks if c["status"]!="MET"]
    result["status"]="REQUIRES_REVIEW" if not result["issues"] else "NOT_MET" if any(c["status"]=="NOT_MET" for c in checks) else "INSUFFICIENT_EVIDENCE"
    return result
