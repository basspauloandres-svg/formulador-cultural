from unittest.mock import AsyncMock, patch
import pytest
from fastapi import HTTPException
from assistant_pilot import AssistantRequest, assist, configured, reserve, _times

def sample():
    return AssistantRequest(section="S02",field="caracteristicas_culturales",
      text="Existen encuentros culturales entre los jóvenes del barrio.",
      action="redactar")

@pytest.mark.asyncio
async def test_no_api_key_fails_closed():
    with patch.dict("os.environ", {"GROQ_API_KEY":""}):
        assert not configured()
        with pytest.raises(HTTPException) as exc:
            await assist(sample(), "Bearer sample")
        assert exc.value.status_code == 503

@pytest.mark.asyncio
async def test_rejects_other_sections_before_call():
    with patch.dict("os.environ", {"GROQ_API_KEY":"test"}):
        with pytest.raises(HTTPException) as exc:
            await assist(sample().model_copy(update={"section":"S16"}), "Bearer sample")
        assert exc.value.status_code == 422

def test_rate_limit_is_per_user_and_global():
    _times.clear()
    assert all(reserve("synthetic-a", now=100) for _ in range(8))
    assert not reserve("synthetic-a", now=101)
    assert reserve("synthetic-b", now=101)
    assert reserve("synthetic-a", now=3701)
    _times.clear()
