from __future__ import annotations
import os
import httpx

class QwenOpenAICompatibleProvider:
    """Prototype adapter for Alibaba Cloud Model Studio's OpenAI-compatible API.

    Experimental only: keeps Qwen behind the existing AIProvider contract.
    """

    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str = "qwen3.8-max",
        client: httpx.Client | None = None,
    ):
        self.api_key = api_key or os.getenv("DASHSCOPE_API_KEY")
        self.base_url = (base_url or os.getenv("QWEN_BASE_URL") or "").rstrip("/")
        self.model = model
        self.client = client or httpx.Client(timeout=60)
        if not self.base_url:
            raise ValueError("QWEN_BASE_URL is required")
        if not self.api_key:
            raise ValueError("DASHSCOPE_API_KEY is required")

    def assist(self, *, section: str, field: str, context: dict) -> dict:
        system = (
            "Actúa como asistente metodológico del Formulador Cultural. "
            "No inventes datos. Usa [POR VERIFICAR] cuando falte confirmación. "
            "Distingue evidencia, interpretación, hipótesis, propuesta de IA y decisión humana. "
            "Vester orienta juicios de influencia y no prueba causalidad. "
            "No tomes decisiones metodológicas por el usuario."
        )
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {
                    "role": "user",
                    "content": f"Sección: {section}\nCampo: {field}\nContexto: {context}",
                },
            ],
            "temperature": 0.1,
        }
        response = self.client.post(
            f"{self.base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        return {
            "provider": "qwen",
            "model": self.model,
            "content": content,
            "raw_usage": data.get("usage"),
        }
