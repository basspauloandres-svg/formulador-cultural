from unittest.mock import patch
import asyncio
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))
import pytest
from fastapi import HTTPException
from assistant_pilot import AssistantRequest, assist, configured, groq_key, reserve, _times

def sample():
    return AssistantRequest(section="S02",field="caracteristicas_culturales",
      text="Existen encuentros culturales entre los jóvenes del barrio.",
      action="redactar")

def test_no_api_key_fails_closed():
    with patch.dict("os.environ", {"GROQ_API_KEY":""}):
        assert not configured()
        with pytest.raises(HTTPException) as exc:
            asyncio.run(assist(sample(), "Bearer sample"))
        assert exc.value.status_code == 503

def test_rejects_other_sections_before_call():
    with patch.dict("os.environ", {"GROQ_API_KEY":"test"}):
        with pytest.raises(HTTPException) as exc:
            asyncio.run(assist(sample().model_copy(update={"section":"S16"}), "Bearer sample"))
        assert exc.value.status_code == 422

def test_rate_limit_is_per_user_and_global():
    _times.clear()
    assert all(reserve("synthetic-a", now=100) for _ in range(8))
    assert not reserve("synthetic-a", now=101)
    assert reserve("synthetic-b", now=101)
    assert reserve("synthetic-a", now=3701)
    _times.clear()


def test_key_whitespace_is_trimmed_without_leaking():
    with patch.dict("os.environ", {"GROQ_API_KEY": "  test-credential\n"}):
        assert groq_key() == "test-credential"
        assert configured()
    with patch.dict("os.environ", {"GROQ_API_KEY": "test\ncredential"}):
        assert groq_key() == ""
        assert not configured()


@pytest.mark.parametrize("status,retry,expected,delay",[
    (429,"18",429,"18"),(429,"0",429,"5"),(429,"999999",429,"300"),
    (429,"invalid",429,"10"),(401,"",401,None),(403,"",401,None),
    (500,"",503,None),(502,"",503,None),(408,"",503,None)
])
def test_auth_upstream_status_not_confused_with_invalid_session(status,retry,expected,delay):
    import httpx
    from unittest.mock import AsyncMock
    from assistant_pilot import verified_user
    response=httpx.Response(status,headers={"Retry-After":retry},json={"error":"synthetic private diagnostic"})
    with patch("assistant_pilot.httpx.AsyncClient") as client:
        client.return_value.__aenter__.return_value.get=AsyncMock(return_value=response)
        with pytest.raises(HTTPException) as exc:
            asyncio.run(verified_user("Bearer synthetic-token"))
        assert exc.value.status_code==expected
        assert "private diagnostic" not in exc.value.detail
        assert (exc.value.headers or {}).get("Retry-After")==delay

@pytest.mark.parametrize("body",[b"invalid json",b"[]",b"null"])
def test_auth_malformed_response_is_service_failure(body):
    import httpx
    from unittest.mock import AsyncMock
    from assistant_pilot import verified_user
    with patch("assistant_pilot.httpx.AsyncClient") as client:
        client.return_value.__aenter__.return_value.get=AsyncMock(return_value=httpx.Response(200,content=body))
        with pytest.raises(HTTPException) as exc:
            asyncio.run(verified_user("Bearer synthetic-token"))
        assert exc.value.status_code==503

def test_auth_valid_identity_and_transport_error():
    import httpx
    from unittest.mock import AsyncMock
    from assistant_pilot import verified_user
    with patch("assistant_pilot.httpx.AsyncClient") as client:
        get=client.return_value.__aenter__.return_value.get
        client.return_value.__aenter__.return_value.get=AsyncMock(return_value=httpx.Response(200,json={"id":"synthetic-user"}))
        assert asyncio.run(verified_user("Bearer synthetic-token"))=="synthetic-user"
        client.return_value.__aenter__.return_value.get=AsyncMock(side_effect=httpx.ConnectError("synthetic failure"))
        with pytest.raises(HTTPException) as exc:
            asyncio.run(verified_user("Bearer synthetic-token"))
        assert exc.value.status_code==503
