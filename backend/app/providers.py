from __future__ import annotations

import os
from typing import Protocol


class LLMProvider(Protocol):
    def generate(self, prompt: str, *, system_prompt: str = "") -> str:
        ...


class LocalFallbackProvider:
    def generate(self, prompt: str, *, system_prompt: str = "") -> str:
        return (
            "I’m operating in local fallback mode because no LLM API key is configured. "
            "The system remains grounded in deterministic job and candidate data."
        )


class GeminiProvider:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("LLM_API_KEY")
        self.model = os.getenv("GEMINI_MODEL", "models/gemini-3-flash-preview")
        self.use_google_search = (os.getenv("GEMINI_USE_GOOGLE_SEARCH", "false").strip().lower() == "true")

    def _is_placeholder(self) -> bool:
        key = (self.api_key or "").strip().lower()
        return key in {"", "replace_me", "changeme", "your_key_here"}

    def generate(self, prompt: str, *, system_prompt: str = "") -> str:
        if self._is_placeholder():
            return LocalFallbackProvider().generate(prompt, system_prompt=system_prompt)

        try:
            from google import genai

            client = genai.Client(api_key=self.api_key)
            tools = [{"type": "google_search"}] if self.use_google_search else None
            generation_config = {
                "temperature": float(os.getenv("LLM_TEMPERATURE", "0.2")),
                "max_output_tokens": int(os.getenv("LLM_MAX_OUTPUT_TOKENS", "4096")),
                "top_p": float(os.getenv("LLM_TOP_P", "0.95")),
            }

            full_input = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt

            # Newer SDK surface
            if hasattr(client, "interactions") and hasattr(client.interactions, "create"):
                interaction = client.interactions.create(
                    model=self.model,
                    input=full_input,
                    tools=tools,
                    generation_config=generation_config,
                )
                if getattr(interaction, "steps", None):
                    return str(interaction.steps[-1])
                return "No response received from Gemini interaction."

            # Backward-compatible SDK surface
            if hasattr(client, "models") and hasattr(client.models, "generate_content"):
                response = client.models.generate_content(
                    model=self.model,
                    contents=full_input,
                )
                if hasattr(response, "text") and response.text:
                    return str(response.text).strip()
                return str(response)

            return "Gemini SDK is available but no supported generation API surface was found."
        except Exception:
            return LocalFallbackProvider().generate(prompt, system_prompt=system_prompt)


class OpenAIProvider:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.getenv("LLM_API_KEY")
        self.model = os.getenv("LLM_MODEL", "gpt-4o-mini")
        self.base_url = os.getenv("LLM_BASE_URL", "").strip()

    def _is_placeholder(self) -> bool:
        key = (self.api_key or "").strip().lower()
        return key in {"", "replace_me", "changeme", "your_key_here"}

    def generate(self, prompt: str, *, system_prompt: str = "") -> str:
        if self._is_placeholder():
            return LocalFallbackProvider().generate(prompt, system_prompt=system_prompt)

        try:
            from openai import OpenAI

            client = OpenAI(api_key=self.api_key, base_url=self.base_url or None)
            response = client.responses.create(
                model=self.model,
                input=[
                    {"role": "system", "content": system_prompt or "You are a helpful recruiting assistant."},
                    {"role": "user", "content": prompt},
                ],
            )
            return response.output_text.strip() if hasattr(response, "output_text") else "LLM response created."
        except Exception:
            return LocalFallbackProvider().generate(prompt, system_prompt=system_prompt)


def get_llm_provider() -> LLMProvider:
    provider = os.getenv("LLM_PROVIDER", "openai-compatible").strip().lower()
    if provider in {"gemini", "google", "google-genai"}:
        return GeminiProvider()

    api_key = os.getenv("LLM_API_KEY") or ""
    if api_key and api_key.strip().lower() not in {"replace_me", "changeme", "your_key_here"}:
        return OpenAIProvider(api_key)
    return LocalFallbackProvider()
