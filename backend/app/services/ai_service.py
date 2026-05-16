import json
import re
import os
from typing import Any

import httpx

from app.core.config import settings


async def analyze_milk(data):
    if data["fat"] < 3.0:
        return "Adulterated"
    return "Pure"


LOCAL_REPLIES = {
    "greeting": (
        "Namaste. I can help with dairy, cattle health, crop planning, milk quality, payments, "
        "fodder, loans, and government schemes. Ask your question in simple words and mention the animal, crop, or problem."
    ),
    "milk_price": (
        "Milk price usually depends on fat, SNF, quality, and local union rates. Check the current rate board, "
        "ask for the fat/SNF calculation, and keep the collection slip before selling."
    ),
    "payment": (
        "For delayed payment, first check the last collection slip, fat/SNF entry, bank status, and whether any quality deduction was applied. "
        "If everything looks correct, contact the milk society with your records."
    ),
    "feed": (
        "For better milk yield, give a balanced ration: green fodder, dry fodder, concentrate, mineral mixture, and clean water. "
        "Change feed gradually over 7 to 10 days so digestion stays stable."
    ),
    "milk_quality": (
        "To improve milk quality, wash the udder before milking, use clean cans, cool milk quickly, and do not mix old milk with fresh milk. "
        "Track fat, SNF, and souring complaints regularly."
    ),
    "mastitis": (
        "To reduce mastitis, keep the shed clean and dry, wash hands and udder before milking, use clean towels, and dry the udder properly after milking. "
        "Isolate animals with swelling, clots, or pain and contact a vet early."
    ),
    "vaccination": (
        "Keep a vaccination calendar for FMD, HS, BQ, and other local vet-recommended vaccines. Follow the schedule from the local animal husbandry office or vet."
    ),
    "pregnancy": (
        "For pregnant animals, give balanced feed, clean water, stress-free shelter, and regular vet checks. "
        "Avoid overworking the animal and watch for discharge, reduced appetite, or weakness."
    ),
    "deworming": (
        "Deworming should be done on a regular vet-guided schedule, especially for young stock. Use the correct dose for the animal's weight and keep the shed clean."
    ),
    "crop": (
        "For crop help, tell me the crop name, stage, soil type, and the exact problem. I can then suggest irrigation, fertilizer, pest, or weed control steps."
    ),
    "scheme": (
        "For schemes, keep your Aadhaar, bank details, land record, and dairy society records ready. "
        "Tell me your state and farmer type, and I can help narrow the relevant schemes."
    ),
    "loan": (
        "For farm loans, check your KYC, land papers, income proof, and repayment history. Compare interest rate, subsidy, and processing time before applying."
    ),
    "cattle_care": (
        "For cattle care, keep the shed clean, provide shade and ventilation, fresh water, balanced feed, and daily observation for appetite, manure, and activity changes."
    ),
    "default": (
        "I can help with dairy, cattle care, feed, milk quality, payments, vaccination, breeding, cropping, and schemes. "
        "Please ask with a little more detail, such as the animal, crop, symptoms, or payment issue."
    ),
}


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip().lower()


def _infer_language(prompt: str) -> str:
    text = prompt.lower()
    if re.search(r"[\u0900-\u097f]", prompt):
        return "hi"
    if re.search(r"[\u0590-\u05ff]", prompt):
        return "en"
    if "language: mr" in text or "preferred language: mr" in text:
        return "mr"
    if "language: hi" in text or "preferred language: hi" in text:
        return "hi"
    return "en"


def _local_reply_for_prompt(prompt: str) -> str:
    # Extract just the user's current question from the prompt
    # The prompt is built as: "You are answering... Current question: <message>"
    question = prompt
    
    # Try to extract "Current question:" part
    if "Current question:" in prompt or "current question:" in prompt:
        parts = prompt.lower().split("current question:")
        if len(parts) > 1:
            question = parts[-1].strip()
    
    text = _normalize_text(question)
    print(f"[AI DEBUG] Using local reply for: {text}")

    keyword_groups = [
        ("greeting", ["hello", "hi", "namaste", "namaskar", "hey"]),
        ("milk_price", ["milk price", "milk rate", "price", "rate", "bhav", "dar"]),
        ("payment", ["payment", "paid", "bill", "money", "bhugtan", "rakkam", "due"]),
        ("feed", ["feed", "fodder", "ration", "chara", "khurak", "aahar", "dana"]),
        ("milk_quality", ["quality", "clean milk", "gunvatta", "souring", "snf", "fat"]),
        ("mastitis", ["mastitis", "udder swelling", "udder", "clot", "milk clot"]),
        ("vaccination", ["vaccin", "fmd", "hs", "bq", "immun"]),
        ("pregnancy", ["pregnant", "pregnancy", "calving", "dry period", "gestation"]),
        ("deworming", ["deworm", "worm", "parasite", "internal parasite"]),
        ("loan", ["loan", "subsidy", "credit", "finance", "bank"]),
        ("scheme", ["scheme", "yojana", "yojana", "government scheme", "subsidy scheme"]),
        ("crop", ["crop", "soil", "fertilizer", "irrigation", "pest", "weed"]),
        ("cattle_care", ["cattle", "cow care", "buffalo care", "shed", "animal care"]),
    ]

    for intent, keywords in keyword_groups:
        if any(keyword in text for keyword in keywords):
            print(f"[AI DEBUG] Matched intent: {intent}")
            return LOCAL_REPLIES[intent]

    if "?" not in text and len(text.split()) <= 2:
        print(f"[AI DEBUG] Matched intent: greeting (short text without question mark)")
        return LOCAL_REPLIES["greeting"]

    print(f"[AI DEBUG] Matched intent: default")
    return LOCAL_REPLIES["default"]


def _resolve_api_key() -> str:
    return (
        settings.AI_API_KEY
        or settings.OPENAI_API_KEY
        or settings.NVIDIA_API_KEY
        or settings.CLAUDE_API_KEY
        or os.getenv("AI_API_KEY", "")
        or os.getenv("OPENAI_API_KEY", "")
        or os.getenv("NVIDIA_API_KEY", "")
        or os.getenv("CLAUDE_API_KEY", "")
    )


def _strip_code_fences(text: str) -> str:
    cleaned = text.strip()

    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    return cleaned.strip()


def _sanitize_assistant_text(text: str) -> str:
    cleaned = _strip_code_fences(text)
    lines = []

    for raw_line in cleaned.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        line = re.sub(r"^[*\-•]\s+", "", line)
        line = re.sub(r"^\d+\.\s+", "", line)
        line = re.sub(r"\*([^*]+)\*", r"\1", line)
        line = re.sub(r"_([^_]+)_", r"\1", line)
        line = re.sub(r"\s+", " ", line).strip()

        if line:
            lines.append(line)

    return " ".join(lines) if lines else cleaned.replace("*", "").strip()


def _extract_message_content(response_data: dict[str, Any]) -> Any:
    choices = response_data.get("choices") or []
    if not choices:
        return None

    message = choices[0].get("message") or {}
    content = message.get("content")
    if content is not None:
        return content

    return choices[0].get("text")


def _parse_json_content(content: Any) -> Any:
    if isinstance(content, (dict, list)):
        return content

    if not isinstance(content, str):
        raise ValueError("AI response content is not JSON-compatible")

    cleaned = _strip_code_fences(content)

    for candidate in (cleaned,):
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    first_object = cleaned.find("{")
    last_object = cleaned.rfind("}")
    if first_object != -1 and last_object != -1 and last_object > first_object:
        try:
            return json.loads(cleaned[first_object:last_object + 1])
        except json.JSONDecodeError:
            pass

    first_array = cleaned.find("[")
    last_array = cleaned.rfind("]")
    if first_array != -1 and last_array != -1 and last_array > first_array:
        try:
            return json.loads(cleaned[first_array:last_array + 1])
        except json.JSONDecodeError:
            pass

    raise ValueError("AI response did not contain valid JSON")


async def _call_ai(messages: list[dict[str, str]]) -> dict[str, Any]:
    api_key = _resolve_api_key()
    if not api_key:
        raise ValueError("AI API key is not configured. Set AI_API_KEY, OPENAI_API_KEY, NVIDIA_API_KEY, or CLAUDE_API_KEY.")

    print(f"[AI DEBUG] API Key resolved: {api_key[:50]}...")
    print(f"[AI DEBUG] Calling NVIDIA API at {settings.AI_API_URL}")

    payload = {
        "model": settings.AI_MODEL,
        "messages": messages,
        "max_tokens": settings.AI_MAX_TOKENS,
        "temperature": settings.AI_TEMPERATURE,
        "top_p": settings.AI_TOP_P,
        "frequency_penalty": settings.AI_FREQUENCY_PENALTY,
        "presence_penalty": settings.AI_PRESENCE_PENALTY,
        "stream": False,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=settings.AI_TIMEOUT_SECONDS) as client:
        try:
            response = await client.post(
                settings.AI_API_URL,
                headers=headers,
                json=payload,
            )
            print(f"[AI DEBUG] API Response Status: {response.status_code}")
        except httpx.HTTPError as exc:
            print(f"[AI DEBUG] HTTP Error: {exc}")
            raise ValueError(f"AI provider request failed: {exc}") from exc

    if response.status_code >= 400:
        error_text = response.text[:500]
        print(f"[AI DEBUG] API Error Response: {error_text}")
        raise ValueError(
            f"AI provider returned {response.status_code}: {error_text}"
        )

    response_json = response.json()
    print(f"[AI DEBUG] API Response: {json.dumps(response_json, ensure_ascii=False)[:200]}...")
    return response_json


async def generate_reply(prompt: str) -> str:
    try:
        response_data = await _call_ai(
            [
                {
                    "role": "system",
                    "content": (
                        "You are SmartShetakari, a careful farm assistant for dairy and crop farmers. "
                        "Answer the user's question fully, with practical steps, short bullet points when useful, "
                        "and ask one clarifying question only if the request is too vague. "
                        "If the user speaks Hindi or Marathi, answer in that language. Otherwise answer in English. "
                        "Helpful topics include milk quality, cattle care, feed, fodder, crop support, payments, "
                        "government schemes, vaccination, and general farm troubleshooting."
                    ),
                },
                {"role": "user", "content": prompt},
            ]
        )
    except ValueError as e:
        print(f"[AI DEBUG] NVIDIA API failed, falling back to local: {e}")
        reply = _local_reply_for_prompt(prompt)
        print(f"[AI DEBUG] Local reply selected: {reply[:100]}...")
        return reply

    content = _extract_message_content(response_data)
    if content is None:
        return _local_reply_for_prompt(prompt)

    if isinstance(content, str):
        return _sanitize_assistant_text(content)

    return _sanitize_assistant_text(json.dumps(content, ensure_ascii=False))


async def generate_json(prompt: str) -> Any:
    try:
        response_data = await _call_ai(
            [
                {
                    "role": "system",
                    "content": (
                        "Return only valid JSON. Do not wrap the response in markdown, "
                        "code fences, or extra commentary."
                    ),
                },
                {"role": "user", "content": prompt},
            ]
        )
    except ValueError:
        return {"status": "fallback", "message": _local_reply_for_prompt(prompt)}

    content = _extract_message_content(response_data)
    if content is None:
        return {"status": "fallback", "message": _local_reply_for_prompt(prompt)}

    return _parse_json_content(content)
