"""Offline paired evaluation, no provider calls, no participant text or identifiers.

One record per case/arm. Capture real reported usage for the same task,
evidence snapshot and configured model. Keep missing values unknown.
Quality scores are externally supplied independent human assessments.
"""
from collections import Counter
from decimal import Decimal
import json
import math

ARMS=("BASELINE","VKE")
KEYS=("case_id","question_sha256","evidence_sha256","model","corpus_version")
USAGE=("prompt_tokens","completion_tokens","cached_prompt_tokens","provider_calls")
CRITERIA={"pertinence":15,"evidence":15,"method":20,"technical":15,
          "budget":15,"indicators":10,"editing":10}

def count(value):
    return type(value) is int and value>=0

def valid_latency(value):
    return type(value) in (float,int) and math.isfinite(value) and value>=0

def valid_usage(row):
    if not all(count(row.get(k)) for k in ("prompt_tokens","completion_tokens","provider_calls")):
        return False
    cached=row.get("cached_prompt_tokens")
    if cached is not None and (not count(cached) or cached>row["prompt_tokens"]):
        return False
    if row["provider_calls"]==0 and (row["prompt_tokens"]!=0 or row["completion_tokens"]!=0 or cached not in (None,0)):
        return False
    return True

def human_score(row):
    assessments=row.get("human_reviews")
    if not isinstance(assessments,list) or len(assessments)<2:
        return None
    ids=set(); totals=[]
    for review in assessments:
        if not isinstance(review,dict) or review.get("type")!="INDEPENDENT_HUMAN":
            return None
        ident=review.get("reviewer_code")
        if not isinstance(ident,str) or not ident or ident in ids:
            return None
        ids.add(ident)
        scores=review.get("scores",{})
        if not isinstance(scores,dict) or set(scores)!=set(CRITERIA):
            return None
        if not all(count(scores[k]) and scores[k]<=limit for k,limit in CRITERIA.items()):
            return None
        critical=review.get("critical_defects")
        if not isinstance(critical,list):
            return None
        totals.append({"total":sum(scores.values()),"critical":bool(critical)})
    return {"scores":totals,"provisional_pass":all(x["total"]>=90 and not x["critical"] for x in totals)}

def compare(rows, rates=None):
    """Rates are optional verified USD per million tokens, recorded externally.
    This is an evaluation of matched records, never an estimate of total bills.
    """
    groups={}
    for row in rows:
        if not isinstance(row,dict) or row.get("arm") not in ARMS or any(not isinstance(row.get(k),str) or not row[k] for k in KEYS):
            raise ValueError("Incomplete case provenance")
        ident=row["case_id"]
        if row["arm"] in groups.setdefault(ident,{}):
            raise ValueError("Duplicate case/arm")
        groups[ident][row["arm"]]=row
    cost_rates=None
    if rates is not None:
        if not rates.get("source") or not rates.get("as_of") or not rates.get("model"):
            raise ValueError("Rate provenance required")
        cost_rates=[Decimal(str(rates[k])) for k in ("input","cached_input","output")]
        if not all(r.is_finite() and r>=0 for r in cost_rates):
            raise ValueError("Invalid rates")
    result=[]
    for case, arms in sorted(groups.items()):
        item={"case_id":case,"status":"INSUFFICIENT_EVIDENCE","tokens_saved":None,
              "cost_saved_usd":None,"latency_delta_ms":None,"quality":None}
        if set(arms)!=set(ARMS):
            item["reason"]="UNPAIRED"
        else:
            a,b=(arms[k] for k in ARMS)
            if any(a[k]!=b[k] for k in KEYS):
                item["reason"]="PROVENANCE_MISMATCH"
            else:
                item["status"]="PAIRED"
                item["outcomes"]={k:arms[k].get("outcome","UNKNOWN") for k in ARMS}
                item["quality"]={k:human_score(arms[k]) for k in ARMS}
                # A reduction caused by an unsuccessful response is not an efficacy gain.
                item["comparable_success"]=all(arms[k].get("outcome")=="OK" for k in ARMS)
                if valid_latency(a.get("latency_ms")) and valid_latency(b.get("latency_ms")):
                    item["latency_delta_ms"]=b["latency_ms"]-a["latency_ms"]
                if valid_usage(a) and valid_usage(b):
                    # Missing cache breakdown does not erase observed total tokens.
                    item["tokens_saved"]=(a["prompt_tokens"]+a["completion_tokens"]-
                                          b["prompt_tokens"]-b["completion_tokens"])
                    item["calls_saved"]=a["provider_calls"]-b["provider_calls"]
                    if cost_rates and rates["model"]==a["model"] and all(count(row.get("cached_prompt_tokens")) for row in (a,b)):
                        def cost(r):
                            return ((r["prompt_tokens"]-r["cached_prompt_tokens"])*cost_rates[0]
                                    +r["cached_prompt_tokens"]*cost_rates[1]
                                    +r["completion_tokens"]*cost_rates[2])/1_000_000
                        item["cost_saved_usd"]=str(cost(a)-cost(b))
                else:
                    item["reason"]="USAGE_UNKNOWN_OR_INVALID"
        result.append(item)
    known=[x for x in result if x["tokens_saved"] is not None]
    return {"cases":result,"statuses":dict(Counter(x["status"] for x in result)),
            "paired_with_complete_usage":len(known),
            "total_tokens_saved":sum(x["tokens_saved"] for x in known) if known and len(known)==len(result) else None,
            "successful_paired_cases":sum(x.get("comparable_success") is True for x in result),
            "quality_ready":bool(result) and all(x.get("comparable_success") is True and x["quality"] and all(q and q["provisional_pass"] for q in x["quality"].values()) for x in result)}

if __name__=="__main__":
    import argparse
    from pathlib import Path
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("observations",type=Path)
    parser.add_argument("--rates",type=Path)
    args=parser.parse_args()
    print(json.dumps(compare(json.loads(args.observations.read_text(encoding="utf-8")),
        json.loads(args.rates.read_text(encoding="utf-8")) if args.rates else None),
        ensure_ascii=False,indent=2))
