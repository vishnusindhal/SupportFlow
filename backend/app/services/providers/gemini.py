from dataclasses import dataclass

import httpx

from app.core.config import get_settings


class ProviderError(Exception):
    pass


@dataclass(frozen=True)
class ProviderResult:
    text: str
    model: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None


class GeminiProvider:
    async def generate(self, prompt: str) -> ProviderResult:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise ProviderError("provider_not_configured")
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{settings.gemini_model}:generateContent"
        )
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        try:
            async with httpx.AsyncClient(timeout=settings.gemini_timeout_seconds) as client:
                response = await client.post(url, params={"key": settings.gemini_api_key}, json=payload)
            if response.status_code in {429, 500, 502, 503, 504}:
                raise ProviderError("provider_temporary_failure")
            response.raise_for_status()
            body = response.json()
            text = body["candidates"][0]["content"]["parts"][0]["text"].strip()
            usage = body.get("usageMetadata", {})
            return ProviderResult(
                text=text,
                model=settings.gemini_model,
                prompt_tokens=usage.get("promptTokenCount"),
                completion_tokens=usage.get("candidatesTokenCount"),
            )
        except (httpx.HTTPError, KeyError, IndexError, TypeError) as exc:
            raise ProviderError("provider_error") from exc
