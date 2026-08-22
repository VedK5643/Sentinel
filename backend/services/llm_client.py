"""
services/llm_client.py — Unified LLM gateway.

Tries Groq (llama-3.3-70b-versatile) first.
On ANY exception or rate-limit, retries against Gemini (gemini-2.0-flash) as fallback.

Every other service MUST call through call_llm(); never import Groq/Gemini
SDKs elsewhere.
"""

import os
import logging
import asyncio

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


async def call_llm(system_prompt: str, user_prompt: str) -> str:
    """
    Send a system + user prompt to an LLM and return the text response.

    Strategy:
      1. Groq  (primary)   — llama-3.3-70b-versatile
      2. Gemini (fallback)  — gemini-3.6-flash (or latest available)
    """
    groq_key = os.getenv("GROQ_API_KEY", "")
    gemini_key = os.getenv("GEMINI_API_KEY", "")

    # ── Attempt 1: Groq ───────────────────────────────────────────────────
    if groq_key:
        try:
            from groq import AsyncGroq

            client = AsyncGroq(api_key=groq_key, timeout=30.0)
            coro = client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=2048,
            )
            response = await asyncio.wait_for(coro, timeout=30.0)
            text = response.choices[0].message.content
            if text:
                logger.info(f"Groq call succeeded using model: {response.model}")
                return text.strip()
        except Exception as exc:
            logger.warning("Groq call failed, falling back to Gemini: %s", exc)

    # ── Attempt 2: Gemini (google.generativeai SDK) ───────────────────────
    if gemini_key:
        try:
            import google.generativeai as genai

            genai.configure(api_key=gemini_key)

            # Combine system + user into a single prompt for Gemini
            combined = (
                f"[SYSTEM INSTRUCTIONS]\n{system_prompt}\n\n"
                f"[USER MESSAGE]\n{user_prompt}"
            )

            # Use the recommended model version
            model = genai.GenerativeModel('gemini-3.6-flash')
            coro = model.generate_content_async(
                combined,
                request_options={"timeout": 30.0}
            )
            response = await asyncio.wait_for(coro, timeout=35.0)
            text = response.text
            if text:
                return text.strip()
        except Exception as exc:
            logger.error("Gemini gemini-3.6-flash failed: %s", exc)

    raise RuntimeError(
        "Both Groq and Gemini LLM calls failed. "
        "Check API keys and network connectivity."
    )


