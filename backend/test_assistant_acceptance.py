"""Pruebas deterministas del contrato del asistente S02; no llaman a Groq ni Supabase."""
import asyncio
import os
import sys
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.dirname(__file__))
import assistant_pilot as pilot


def request(action="redactar"):
    return pilot.AssistantRequest(
        section="S02", field="caracteristicas_culturales",
        text="Neira es un lugar de encuentro cultural entre municipios.",
        context="Neira", action=action,
    )


class MockClient:
    def __init__(self, upstream, capture):
        self.upstream = upstream
        self.capture = capture

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def post(self, url, headers, json):
        assert url == pilot.GROQ_ENDPOINT
        assert headers["Authorization"] == "Bearer test-credential"
        self.capture.update(json)
        return self.upstream


def run_assist(upstream, *, action="redactar"):
    captured = {}
    pilot._times.clear()
    with patch.dict(os.environ, {"GROQ_API_KEY": "test-credential", "GROQ_MODEL": "openai/gpt-oss-20b"}), \
         patch.object(pilot, "verified_user", new=AsyncMock(return_value="synthetic-user")), \
         patch.object(pilot.httpx, "AsyncClient", side_effect=lambda **kwargs: MockClient(upstream, captured)):
        result = asyncio.run(pilot.assist(request(action), "Bearer synthetic-token"))
    pilot._times.clear()
    return result, captured


@pytest.mark.parametrize("action", ["redactar", "orientar"])
def test_valid_response_requires_human_approval_and_has_no_auto_apply(action):
    response = httpx.Response(200, json={
        "choices": [{"message": {"content": "Propuesta para revisión."}, "finish_reason": "stop"}]
    })
    result, payload = run_assist(response, action=action)
    assert result["suggestion"] == "Propuesta para revisión."
    assert result["requires_approval"] is True
    assert result["source"].startswith("Modelo generativo")
    assert result["action"] == action
    assert payload["model"] == "openai/gpt-oss-20b"
    assert payload["reasoning_effort"] == "low"
    assert payload["include_reasoning"] is False
    assert payload["max_completion_tokens"] == 1024
    assert "Neira es un lugar" in payload["messages"][1]["content"]


@pytest.mark.parametrize("content", ["", "   ", None])
def test_empty_model_content_fails_closed(content):
    response = httpx.Response(200, json={
        "choices": [{"message": {"content": content}, "finish_reason": "length"}]
    })
    with pytest.raises(HTTPException) as exc:
        run_assist(response)
    assert exc.value.status_code == 502
    assert "no interpretable" in exc.value.detail


@pytest.mark.parametrize("status,expected", [(400,502),(401,502),(403,502),(404,502),(429,429),(503,502)])
def test_upstream_failure_never_returns_an_approved_proposal(status,expected):
    with pytest.raises(HTTPException) as exc:
        run_assist(httpx.Response(status, json={"error": {"message": "simulated"}}))
    assert exc.value.status_code == expected


def test_unexpected_response_shape_fails_closed():
    with pytest.raises(HTTPException) as exc:
        run_assist(httpx.Response(200, json={"choices": []}))
    assert exc.value.status_code == 502
