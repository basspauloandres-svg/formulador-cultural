from model_usage import ModelBudget
import pytest

def test_budget_shared_across_routes_and_recovers():
    time=[0.]
    b=ModelBudget(cap=400,window=60,clock=lambda:time[0])
    payload={"max_completion_tokens":100}
    assert b.reserve("s02",payload)
    assert b.reserve("section_draft",payload)
    assert not b.reserve("semantic_review",payload)
    time[0]=60.
    assert b.reserve("semantic_review",payload)
    assert b.snapshot()["semantic_review"]["rejected"]==1

def test_usage_is_observed_not_estimated_and_no_content_retained():
    b=ModelBudget()
    b.observe("s02",{"usage":{"prompt_tokens":70,"completion_tokens":12,
                             "prompt_tokens_details":{"cached_tokens":30}},
                     "choices":[{"message":{"content":"private marker"}}]})
    b.observe("s02",{"usage":{"prompt_tokens":False,"completion_tokens":12}})
    b.observe("section_draft",{"usage":{"prompt_tokens":20,"completion_tokens":0}})
    b.observe("semantic_review",{})
    s=b.snapshot()
    assert s["s02"]["prompt_tokens"]==70 and s["s02"]["completion_tokens"]==12
    assert s["s02"]["reported_cache"]==1 and s["s02"]["cached_prompt_tokens"]==30
    assert s["s02"]["missing_usage"]==1
    assert s["section_draft"]["reported_cache"]==0
    assert s["semantic_review"]["missing_usage"]==1
    assert "private marker" not in repr(s)
    with pytest.raises(ValueError):
        b.reserve("s02",{"max_completion_tokens":-1})
