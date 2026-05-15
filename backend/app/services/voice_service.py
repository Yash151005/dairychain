"""
voice_service.py
────────────────
Speech-to-Text  →  LLM (expense / QA)  →  save if expense

STT: Uses NVIDIA NIM's Whisper endpoint (same API key as LLM).
     Falls back to a graceful error if unavailable.

LLM: Uses the existing _call_ai helper from ai_service.py.
"""

import json
import os
import re
import tempfile
from pathlib import Path
from typing import Any

import httpx

from app.core.config import settings
from app.services.ai_service import (
    _call_ai,
    _extract_message_content,
    _local_reply_for_prompt,
    _strip_code_fences,
)


# ────────────────────────────────────────────────────────────
#  NVIDIA / OpenAI-compatible Whisper endpoint
# ────────────────────────────────────────────────────────────
_WHISPER_URL = "https://integrate.api.nvidia.com/v1/audio/transcriptions"
_WHISPER_MODEL = "nvidia/canary-1b"   # or openai/whisper-large-v3 depending on availability
_STT_TIMEOUT = 30.0


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.m4a") -> str:
    """
    Sends raw audio bytes to NVIDIA's Whisper-compatible endpoint.
    Returns the transcribed text, or raises ValueError on failure.
    """
    api_key = (
        settings.NVIDIA_API_KEY
        or settings.AI_API_KEY
        or os.getenv("NVIDIA_API_KEY", "")
        or os.getenv("AI_API_KEY", "")
    )
    if not api_key:
        raise ValueError("NVIDIA API key is not configured for speech-to-text.")

    # Determine MIME type from filename
    ext = Path(filename).suffix.lower()
    mime_map = {
        ".m4a": "audio/m4a",
        ".mp4": "audio/mp4",
        ".wav": "audio/wav",
        ".webm": "audio/webm",
        ".ogg": "audio/ogg",
        ".mp3": "audio/mpeg",
    }
    mime = mime_map.get(ext, "audio/m4a")

    async with httpx.AsyncClient(timeout=_STT_TIMEOUT) as client:
        try:
            response = await client.post(
                _WHISPER_URL,
                headers={"Authorization": f"Bearer {api_key}"},
                files={
                    "file": (filename, audio_bytes, mime),
                    "model": (None, _WHISPER_MODEL),
                    "language": (None, "hi"),      # accepts Hindi + Marathi well
                    "response_format": (None, "json"),
                },
            )
        except httpx.HTTPError as exc:
            raise ValueError(f"STT request failed: {exc}") from exc

    if response.status_code >= 400:
        # Try the text body for a useful error message
        try:
            detail = response.json().get("detail", response.text[:300])
        except Exception:
            detail = response.text[:300]
        raise ValueError(f"STT provider error {response.status_code}: {detail}")

    data = response.json()

    # OpenAI-compatible response: {"text": "..."}
    text = data.get("text") or data.get("transcript") or ""
    if not text:
        raise ValueError("STT returned an empty transcript.")

    return text.strip()


# ────────────────────────────────────────────────────────────
#  LLM — farmer expense / QA intent parser
# ────────────────────────────────────────────────────────────
_SYSTEM_PROMPT = """You are DairyMitra, a voice assistant for Indian dairy farmers.

The farmer just spoke. Their words (transcribed from voice) are:
"{user_text}"

Your job:
1. Detect if this is an EXPENSE statement or a QUESTION/QUERY.
2. Return ONLY valid JSON — no markdown, no explanation.

JSON format for EXPENSE:
{
  "type": "expense",
  "amount": <number or null>,
  "category": "<feed|veterinary|labor|electricity|transport|miscellaneous>",
  "description": "<short English description>",
  "response": "<short confirmation in the same language the farmer used>"
}

JSON format for QA (question/general query):
{
  "type": "qa",
  "response": "<helpful answer in the same language the farmer used, plain text, max 2 sentences>"
}

Rules:
- If the farmer spoke Hindi/Marathi, reply in Hindi/Marathi.
- For expenses: extract the amount from words like \"पाचशे\" (500), \"हजार\" (1000), \"दोनशे\" (200).
- If amount is unclear, set amount to null.
- Categories: feed=चारा/fodder, veterinary=पशुवैद्य/vet/medicine, labor=मजूर/labour,
  electricity=वीज/light bill, transport=वाहतूक/diesel/transport, miscellaneous=everything else.
- Keep responses SHORT — this will be spoken aloud by TTS.
"""


async def parse_voice_intent(transcribed_text: str) -> dict[str, Any]:
    """
    Sends the transcribed text to the NVIDIA LLM and parses the JSON intent.
    Returns a dict with at minimum {"type": ..., "response": ...}.
    """
    prompt = _SYSTEM_PROMPT.replace("{user_text}", transcribed_text)

    try:
        raw = await _call_ai(
            [
                {"role": "system", "content": "You are a JSON-only API. Return only valid JSON, no commentary."},
                {"role": "user", "content": prompt},
            ]
        )
    except ValueError as exc:
        # LLM unavailable — return a graceful QA fallback
        return {
            "type": "qa",
            "response": _local_reply_for_prompt(transcribed_text),
        }

    content = _extract_message_content(raw)
    if not content:
        return {"type": "qa", "response": _local_reply_for_prompt(transcribed_text)}

    # Parse JSON
    if isinstance(content, dict):
        return content

    cleaned = _strip_code_fences(content)

    # Try direct parse
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Try extracting embedded JSON object
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    # Last resort: return raw as QA
    return {"type": "qa", "response": cleaned[:300]}


# ────────────────────────────────────────────────────────────
#  Combined pipeline
# ────────────────────────────────────────────────────────────
async def process_voice_query(
    audio_bytes: bytes,
    filename: str,
    farmer_id: str = "",
) -> dict[str, Any]:
    """
    Full pipeline:
      audio_bytes → STT → LLM intent → return structured result

    Returns dict:
    {
      "transcript": str,
      "type": "expense" | "qa",
      "amount": float | None,        (expense only)
      "category": str,               (expense only)
      "description": str,            (expense only)
      "response": str,               (always present — spoken back to user)
    }
    """
    # 1. Speech → Text
    try:
        transcript = await transcribe_audio(audio_bytes, filename)
    except ValueError as exc:
        return {
            "transcript": "",
            "type": "error",
            "response": f"आवाज समजला नाही. कृपया पुन्हा बोला. ({exc})",
        }

    if not transcript:
        return {
            "transcript": "",
            "type": "error",
            "response": "आवाज समजला नाही. कृपया स्पष्टपणे बोला.",
        }

    # 2. LLM intent parsing
    intent = await parse_voice_intent(transcript)
    intent["transcript"] = transcript

    return intent
