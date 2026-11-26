from copy import deepcopy
from call_profile import preflight,valid_profile

SOURCE={"url":"https://example.org/synthetic-terms.pdf","locator":"p. 1","sha256":"a"*64}
def profile():
    rule=lambda id:{"id":id,"label":id,"source":SOURCE}
    return {"id":"QA-CALL","version":"1","issuer":"Entidad ficticia","title":"Convocatoria sintética",
            "currency":"COP","status":"CURATOR_APPROVED","terms":SOURCE,
            "opens":"2026-01-01","closes":"2026-12-01","max_requested":"1000",
            "requirements":[rule("R1")],"annexes":[rule("A1")],
            "eligible_categories":[rule("materials")],"evaluation_criteria":[rule("pertinence")]}
def project():
    return {"currency":"COP","requested_amount":100,
            "requested_costs":[{"category":"materials","amount":100}],
            "requirements":{"R1":{"status":"MET","reference":"QA document"}},
            "annexes":{"A1":{"status":"MET","reference":"QA annex"}},
            "master_review_current":True}

def test_complete_declared_checks_require_human_review():
    p=profile()
    assert valid_profile(p)
    result=preflight(p,project(),"2026-11-25")
    assert result["status"]=="REQUIRES_REVIEW"
    assert result["ready_to_submit"] is False
    assert not result["issues"]
    assert result["evaluation_criteria"]

def test_unknown_or_invalid_call_never_claims_eligibility():
    for p in [None,{**profile(),"status":"CANDIDATE"},{**profile(),"closes":"2026-02-30"},
              {**profile(),"terms":{"url":"http://example.org","locator":"p. 1","sha256":"a"*64}},
              {**profile(),"evaluation_criteria":[]}]:
        assert preflight(p,project(),"2026-11-25")["status"]=="INSUFFICIENT_EVIDENCE"
    assert preflight(profile(),{**project(),"requirements":{}},"2026-11-25")["status"]=="INSUFFICIENT_EVIDENCE"
    assert preflight(profile(),{**project(),"requested_amount":None},"2026-11-25")["status"]=="INSUFFICIENT_EVIDENCE"
    assert preflight(profile(),{**project(),"master_review_current":False},"2026-11-25")["status"]=="INSUFFICIENT_EVIDENCE"

def test_over_cap_ineligible_costs_mismatch_and_expired():
    for data,when in [
        ({**project(),"requested_amount":1001},"2026-11-25"),
        ({**project(),"requested_costs":[{"category":"travel","amount":100}]},"2026-11-25"),
        ({**project(),"requested_costs":[{"category":"materials","amount":10}]},"2026-11-25"),
        (project(),"2026-12-02")]:
        result=preflight(profile(),data,when)
        assert result["status"]=="NOT_MET"
        assert result["ready_to_submit"] is False
