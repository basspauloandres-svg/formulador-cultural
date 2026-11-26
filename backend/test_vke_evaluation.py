from vke_evaluation import compare,CRITERIA
import pytest

def pair():
    common={"case_id":"QA-01","question_sha256":"a"*64,"evidence_sha256":"b"*64,
            "model":"synthetic-model","corpus_version":"fixture-v1","outcome":"OK"}
    return [{**common,"arm":"BASELINE","prompt_tokens":500,"completion_tokens":100,
             "cached_prompt_tokens":200,"provider_calls":1,"latency_ms":150},
            {**common,"arm":"VKE","prompt_tokens":0,"completion_tokens":0,
             "cached_prompt_tokens":0,"provider_calls":0,"latency_ms":5}]

def test_paired_usage_and_unknown_cost():
    result=compare(pair())
    assert result["total_tokens_saved"]==600
    assert result["cases"][0]["cost_saved_usd"] is None
    assert result["cases"][0]["latency_delta_ms"]==-145
    assert not result["quality_ready"]

def test_missing_or_noncomparable_observations():
    a,b=pair()
    b["cached_prompt_tokens"]=None
    assert compare([a,b])["total_tokens_saved"] is None
    b["evidence_sha256"]="different"
    assert compare([a,b])["cases"][0]["reason"]=="PROVENANCE_MISMATCH"
    assert compare([a])["cases"][0]["reason"]=="UNPAIRED"
    with pytest.raises(ValueError):
        compare([a,a])

def test_cost_calculation_and_review_gate():
    rows=pair()
    rates={"model":"synthetic-model","input":"1","cached_input":"0.5","output":"2",
           "source":"synthetic fixture","as_of":"2026-11-25"}
    assert compare(rows,rates)["cases"][0]["cost_saved_usd"]=="0.0006"
    for row in rows:
        row["human_reviews"]=[{"reviewer_code":str(n),"type":"INDEPENDENT_HUMAN",
                               "scores":dict(CRITERIA),"critical_defects":[]} for n in range(2)]
    assert compare(rows)["quality_ready"]
    rows[1]["human_reviews"][0]["critical_defects"]=["Unsubstantiated claim"]
    assert not compare(rows)["quality_ready"]
    rows[1]["human_reviews"][0]["critical_defects"]=[]
    rows[1]["human_reviews"][0]["type"]="MODEL"
    assert not compare(rows)["quality_ready"]
