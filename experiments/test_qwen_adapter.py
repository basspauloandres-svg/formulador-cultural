import json
import httpx
from qwen_adapter import QwenOpenAICompatibleProvider

def test_qwen_adapter_contract():
    observed = {}

    def handler(request: httpx.Request):
        observed["url"] = str(request.url)
        observed["auth"] = request.headers.get("authorization")
        observed["body"] = json.loads(request.content.decode())
        return httpx.Response(
            200,
            json={
                "choices": [{"message": {"content": "[POR VERIFICAR] Propuesta de IA."}}],
                "usage": {"prompt_tokens": 10, "completion_tokens": 4},
            },
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    provider = QwenOpenAICompatibleProvider(
        api_key="test-key",
        base_url="https://workspace.example/compatible-mode/v1",
        client=client,
    )
    output = provider.assist(
        section="S06",
        field="Justificación",
        context={"score": 3},
    )

    assert observed["url"].endswith("/compatible-mode/v1/chat/completions")
    assert observed["auth"] == "Bearer test-key"
    assert observed["body"]["model"] == "qwen3.8-max"
    assert "Vester orienta" in observed["body"]["messages"][0]["content"]
    assert output["provider"] == "qwen"
    assert output["content"].startswith("[POR VERIFICAR]")
