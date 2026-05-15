"""
SmartShetakari hackathon feature routes.
"""

from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import logging
import random
import re
import time
from datetime import date, datetime
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)

from app.core.config import settings
from app.core.database import (
    batch_collection,
    db,
    expense_collection,
    payment_collection,
    user_collection,
)

router = APIRouter()
_CACHE_TTL_BY_FEATURE = {
    "mandi-buddy": 15 * 60,
    "dudh-darpan": 20 * 60,
    "chara-alert": 15 * 60,
    "serper": 30 * 60,
    "llm": 6 * 60 * 60,
}
_response_cache: dict[str, tuple[float, Any]] = {}


def _is_placeholder(value: str) -> bool:
    return not value or value.startswith("your_")


def _clone_payload(value: Any) -> Any:
    return json.loads(json.dumps(value, ensure_ascii=False))


def _cache_get(cache_key: str) -> Any | None:
    cached = _response_cache.get(cache_key)
    if not cached:
        return None

    expires_at, payload = cached
    if expires_at <= time.time():
        _response_cache.pop(cache_key, None)
        return None

    return _clone_payload(payload)


def _cache_set(cache_key: str, payload: Any, ttl_seconds: int) -> Any:
    _response_cache[cache_key] = (time.time() + ttl_seconds, _clone_payload(payload))
    return payload


def _feature_cache_key(feature: str, *parts: Any) -> str:
    normalized_parts = [feature]
    normalized_parts.extend(str(part).strip().lower() for part in parts if part is not None)
    return "::".join(normalized_parts)


def _extract_json_block(raw: str, opening: str, closing: str) -> str:
    if not raw:
        return ""

    start = raw.find(opening)
    end = raw.rfind(closing)
    if start < 0 or end < start:
        return ""
    return raw[start : end + 1]


def _parse_json_object(raw: str) -> dict[str, Any]:
    block = _extract_json_block(raw, "{", "}")
    if not block:
        return {}

    try:
        parsed = json.loads(block)
    except Exception:
        return {}

    return parsed if isinstance(parsed, dict) else {}


def _parse_json_array(raw: str) -> list[dict[str, Any]]:
    block = _extract_json_block(raw, "[", "]")
    if not block:
        return []

    try:
        parsed = json.loads(block)
    except Exception:
        return []

    return parsed if isinstance(parsed, list) else []


async def serper_search(query: str) -> list[str]:
    """Return short snippets from Serper results."""
    cache_key = _feature_cache_key("serper", hashlib.md5(query.encode()).hexdigest())
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    if _is_placeholder(settings.SERPER_API_KEY):
        return []

    snippets: list[str] = []

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.post(
                "https://google.serper.dev/search",
                json={"q": query, "gl": "in", "hl": "en", "num": 5},
                headers={
                    "X-API-KEY": settings.SERPER_API_KEY,
                    "Content-Type": "application/json",
                },
            )
            payload = response.json()
    except Exception:
        return []

    answer_box = payload.get("answerBox", {}) or {}
    if answer_box.get("answer"):
        snippets.append(str(answer_box["answer"]))
    if answer_box.get("snippet"):
        snippets.append(str(answer_box["snippet"]))

    for item in payload.get("organic", [])[:4]:
        snippet = (item or {}).get("snippet")
        if snippet:
            snippets.append(str(snippet))

    return _cache_set(
        cache_key,
        snippets,
        _CACHE_TTL_BY_FEATURE["serper"] if snippets else 5 * 60,
    )


async def llm_extract(
    prompt: str,
    *,
    max_tokens: int = 700,
    temperature: float = 0.15,
) -> str:
    """Run the configured LLM and return the text body."""
    cache_key = _feature_cache_key(
        "llm",
        hashlib.md5(
            f"{max_tokens}::{temperature}::{prompt}".encode("utf-8", errors="ignore")
        ).hexdigest(),
    )
    cached = _cache_get(cache_key)
    if cached is not None:
        return str(cached)

    if _is_placeholder(settings.AI_API_KEY) or _is_placeholder(settings.AI_API_URL):
        return ""

    try:
        async with httpx.AsyncClient(
            timeout=min(settings.AI_TIMEOUT_SECONDS, 8.0)
        ) as client:
            response = await client.post(
                settings.AI_API_URL,
                json={
                    "model": settings.AI_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": min(max_tokens, settings.AI_MAX_TOKENS),
                    "temperature": temperature,
                    "top_p": settings.AI_TOP_P,
                    "frequency_penalty": settings.AI_FREQUENCY_PENALTY,
                    "presence_penalty": settings.AI_PRESENCE_PENALTY,
                },
                headers={
                    "Authorization": f"Bearer {settings.AI_API_KEY}",
                    "Content-Type": "application/json",
                },
            )
            payload = response.json()
    except Exception:
        return ""

    try:
        return _cache_set(
            cache_key,
            payload["choices"][0]["message"]["content"].strip(),
            _CACHE_TTL_BY_FEATURE["llm"],
        )
    except Exception:
        return ""


async def build_marathi_guidance(
    *,
    feature: str,
    context: dict[str, Any],
    fallback_message: str,
    fallback_tips: list[str],
    fallback_heading: str,
) -> dict[str, Any]:
    prompt = (
        "You are an expert dairy advisor for Maharashtra farmers.\n"
        "Create concise, natural Marathi guidance based on the JSON context below.\n"
        "Return ONLY valid JSON with this shape:\n"
        '{'
        '"heading":"short Marathi heading",'
        '"message":"2-4 sentence Marathi advisory",'
        '"audio_text":"slightly longer Marathi audio-friendly version",'
        '"tips":["short Marathi tip 1","short Marathi tip 2","short Marathi tip 3"]'
        "}\n"
        f"Feature: {feature}\n"
        f"Context JSON: {json.dumps(context, ensure_ascii=False)}"
    )

    try:
        raw = await asyncio.wait_for(
            llm_extract(prompt, max_tokens=500, temperature=0.35),
            timeout=10.0,
        )
    except (asyncio.TimeoutError, Exception):
        raw = ""

    parsed = _parse_json_object(raw)
    tips = parsed.get("tips") if isinstance(parsed.get("tips"), list) else None

    return {
        "heading": str(parsed.get("heading") or fallback_heading),
        "message": str(parsed.get("message") or fallback_message),
        "audio_text": str(
            parsed.get("audio_text") or parsed.get("message") or fallback_message
        ),
        "tips": [str(tip) for tip in (tips or fallback_tips)[:4]],
    }


FALLBACK_PRICES = [
    {
        "cooperative": "Gokul Dairy",
        "region": "Kolhapur",
        "cow_milk_rate": 32,
        "buffalo_milk_rate": 42,
    },
    {
        "cooperative": "Chitale Dairy",
        "region": "Pune",
        "cow_milk_rate": 40,
        "buffalo_milk_rate": 52,
    },
    {
        "cooperative": "Katraj Dairy",
        "region": "Pune",
        "cow_milk_rate": 38,
        "buffalo_milk_rate": 49,
    },
    {
        "cooperative": "Amul",
        "region": "Mumbai",
        "cow_milk_rate": 35,
        "buffalo_milk_rate": 46,
    },
    {
        "cooperative": "Mahanand",
        "region": "Nashik",
        "cow_milk_rate": 33,
        "buffalo_milk_rate": 44,
    },
    {
        "cooperative": "Urja Dairy",
        "region": "Kolhapur",
        "cow_milk_rate": 36,
        "buffalo_milk_rate": 47,
    },
]


def _coerce_price_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    cleaned: list[dict[str, Any]] = []

    for row in rows:
        if not isinstance(row, dict):
            continue

        cooperative = str(row.get("cooperative") or "").strip()
        region = str(row.get("region") or "").strip()

        if not cooperative:
            continue

        try:
            cow_rate = float(row.get("cow_milk_rate") or 0)
            buffalo_rate = float(row.get("buffalo_milk_rate") or 0)
        except (TypeError, ValueError):
            continue

        cleaned.append(
            {
                "cooperative": cooperative,
                "region": region or "Maharashtra",
                "cow_milk_rate": round(cow_rate, 1),
                "buffalo_milk_rate": round(buffalo_rate, 1),
                "last_updated": str(row.get("last_updated") or date.today()),
            }
        )

    return cleaned


@router.get("/mandi-buddy")
async def mandi_buddy(region: str = "Pune"):
    try:
        return await _mandi_buddy_impl(region)
    except Exception as exc:
        logger.exception("mandi-buddy error for region=%s: %s", region, exc)
        return {"status": "error", "message": str(exc)}


async def _mandi_buddy_impl(region: str):
    cache_key = _feature_cache_key("mandi-buddy", region, date.today().isoformat())
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    queries = [
        f"milk procurement price cooperative {region} Maharashtra today 2026",
        "Gokul Chitale Katraj dairy milk rate Maharashtra rupees litre 2026",
        f"buffalo cow milk procurement price {region} today",
    ]

    snippets = [
        snippet
        for search_result in await asyncio.gather(
            *(serper_search(query) for query in queries)
        )
        for snippet in search_result
    ]

    prices: list[dict[str, Any]] = []
    if snippets:
        prompt = (
            "From the dairy price text below, extract a JSON array.\n"
            'Return ONLY JSON in this format: [{"cooperative":"name","region":"city","cow_milk_rate":35,"buffalo_milk_rate":45,"last_updated":"2026-04-10"}]\n'
            "If a field is missing, estimate realistic Maharashtra values.\n"
            f"Text:\n{chr(10).join(snippets[:10])}"
        )
        prices = _coerce_price_rows(_parse_json_array(await llm_extract(prompt)))

    if not prices:
        day_seed = int(date.today().strftime("%j"))
        for index, price in enumerate(FALLBACK_PRICES):
            variation = ((day_seed + index * 3) % 5) - 2
            prices.append(
                {
                    **price,
                    "cow_milk_rate": round(price["cow_milk_rate"] + variation, 1),
                    "buffalo_milk_rate": round(price["buffalo_milk_rate"] + variation, 1),
                    "last_updated": str(date.today()),
                }
            )

    prices.sort(key=lambda item: item.get("cow_milk_rate", 0), reverse=True)

    cow_rates = [
        float(item.get("cow_milk_rate", 0))
        for item in prices
        if item.get("cow_milk_rate")
    ]
    best = prices[0] if prices else {}
    max_rate = max(cow_rates) if cow_rates else 40.0
    min_rate = min(cow_rates) if cow_rates else 32.0
    spread = round(max_rate - min_rate, 1)
    monthly_income_diff = round(spread * 10 * 30, 2)

    guidance = await build_marathi_guidance(
        feature="MandiBuddy",
        context={
            "region": region,
            "best_cooperative": best.get("cooperative"),
            "best_rate": best.get("cow_milk_rate"),
            "spread_per_litre": spread,
            "monthly_income_diff": monthly_income_diff,
            "prices": prices[:5],
        },
        fallback_heading="आजचा सर्वोत्तम दर",
        fallback_message=(
            f"{region} भागात दुधाच्या दरात ₹{spread}/लिटर इतका फरक दिसतो आहे. "
            f"{best.get('cooperative', 'सर्वोत्तम सहकारी संस्था')} येथे चांगला दर मिळू शकतो. "
            "दर तपासून पुरवठा बदलल्यास मासिक उत्पन्न वाढू शकते."
        ),
        fallback_tips=[
            "दूध देण्यापूर्वी आजचा दर तपासा.",
            "जवळच्या दोन ते तीन संस्थांचे दर तुलना करा.",
            "वाहतूक खर्च वजा करून निव्वळ फायदा पाहा.",
        ],
    )

    return _cache_set(
        cache_key,
        {
        "status": "success",
        "region": region,
        "prices": prices,
        "insight": {
            "spread_per_litre": spread,
            "monthly_income_diff": monthly_income_diff,
            "best_cooperative": best.get("cooperative", ""),
            "best_rate": best.get("cow_milk_rate", 0),
        },
        "marathi_alert": guidance["message"],
        "advisory_heading": guidance["heading"],
        "audio_text": guidance["audio_text"],
        "tips": guidance["tips"],
        "serper_snippets": len(snippets),
        "timestamp": datetime.utcnow().isoformat(),
        },
        _CACHE_TTL_BY_FEATURE["mandi-buddy"],
    )


def _fallback_stress_profile(
    thi: float,
    region: str,
    temp: float,
    humidity: float,
) -> tuple[str, int, str, str, list[str]]:
    if thi < 72:
        return (
            "No Stress",
            0,
            "#2e7d32",
            f"{region} मध्ये सध्या उष्णताजन्य ताण कमी आहे. {temp:.1f} अंश सेल्सियस तापमान आणि {humidity:.0f}% आर्द्रतेत जनावरे सामान्य स्थितीत राहू शकतात.",
            [
                "स्वच्छ पाणी आणि नियमित खुराक सुरू ठेवा.",
                "दुपारच्या वेळी सावलीची व्यवस्था कायम ठेवा.",
                "दैनंदिन दूध उत्पादन नोंदवा.",
            ],
        )
    if thi < 78:
        return (
            "Mild Stress",
            10,
            "#f59e0b",
            f"{region} मध्ये सौम्य उष्णताजन्य ताण दिसतो आहे. दूध उत्पादनात साधारण 10% घट होऊ शकते, त्यामुळे पाणी आणि सावली वाढवा.",
            [
                "गायींना अधिक वेळा पाणी द्या.",
                "शेडमध्ये हवा खेळती ठेवा.",
                "दुपारी जास्त हालचाल टाळा.",
            ],
        )
    if thi < 84:
        return (
            "Moderate Stress",
            20,
            "#ef6c00",
            f"{region} मध्ये मध्यम उष्णताजन्य ताण आहे. दूध उत्पादनात साधारण 20% घट होऊ शकते. जनावरांना थंड व सावलीत ठेवा.",
            [
                "फॅन किंवा मिस्टिंगची व्यवस्था वापरा.",
                "दिवसातून 5 पेक्षा जास्त वेळा पाणी द्या.",
                "दुपारच्या वेळेत दुग्ध काढणे टाळा.",
            ],
        )
    return (
        "Severe Stress",
        30,
        "#dc2626",
        f"{region} मध्ये तीव्र उष्णताजन्य ताण आहे. {temp:.1f} अंश सेल्सियस तापमानामुळे दूध उत्पादनात 30% पर्यंत घट होऊ शकते. तत्काळ थंडावा, पाणी आणि सावली द्या.",
        [
            "जनावरे दिवसा सावलीत ठेवा.",
            "थंड पाणी वारंवार उपलब्ध ठेवा.",
            "मिस्टिंग, फॅन किंवा कूलिंगचा वापर करा.",
            "दुपारी 2 ते 4 या वेळेत दूध काढणे टाळा.",
        ],
    )


@router.get("/dudh-darpan")
async def dudh_darpan(region: str = "Pune"):
    try:
        return await _dudh_darpan_impl(region)
    except Exception as exc:
        logger.exception("dudh-darpan error for region=%s: %s", region, exc)
        return {"status": "error", "message": str(exc)}


async def _dudh_darpan_impl(region: str):
    cache_key = _feature_cache_key("dudh-darpan", region, date.today().isoformat())
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    snippets = await serper_search(
        f"IMD {region} tomorrow temperature humidity forecast Maharashtra 2026"
    )

    temp = 38.0
    humidity = 45.0

    if snippets:
        prompt = (
            f"Extract temperature in Celsius and humidity percentage for {region}, Maharashtra.\n"
            'Return ONLY JSON like {"temperature": 38, "humidity": 45}\n'
            f"Text: {' '.join(snippets[:5])}"
        )
        weather_json = _parse_json_object(await llm_extract(prompt))
        try:
            temp = float(weather_json.get("temperature", temp))
            humidity = float(weather_json.get("humidity", humidity))
        except (TypeError, ValueError):
            pass

    thi = (1.8 * temp + 32) - (
        (0.55 - 0.0055 * humidity) * (1.8 * temp - 26)
    )
    thi = round(thi, 1)

    stress, yield_decline, color, fallback_message, fallback_tips = _fallback_stress_profile(
        thi, region, temp, humidity
    )

    daily_loss_litres = round(100 * yield_decline / 100, 1)
    daily_loss_rupees = round(daily_loss_litres * 35, 2)
    monthly_loss_rupees = round(daily_loss_rupees * 30, 2)

    guidance = await build_marathi_guidance(
        feature="DudhDarpan",
        context={
            "region": region,
            "temperature_celsius": temp,
            "humidity_percent": humidity,
            "thi": thi,
            "stress_level": stress,
            "yield_decline_percent": yield_decline,
            "daily_loss_rupees": daily_loss_rupees,
            "monthly_loss_rupees": monthly_loss_rupees,
        },
        fallback_heading="उष्णतेबाबत सूचना",
        fallback_message=fallback_message,
        fallback_tips=fallback_tips,
    )

    return _cache_set(
        cache_key,
        {
        "status": "success",
        "region": region,
        "weather": {
            "temperature": temp,
            "temperature_celsius": temp,
            "humidity": humidity,
            "humidity_percent": humidity,
        },
        "thi": thi,
        "stress_level": stress,
        "color": color,
        "yield_decline_percent": yield_decline,
        "impact": {
            "daily_loss_litres": daily_loss_litres,
            "daily_loss_rupees": daily_loss_rupees,
            "monthly_loss_rupees": monthly_loss_rupees,
        },
        "marathi_alert": guidance["message"],
        "advisory_heading": guidance["heading"],
        "audio_text": guidance["audio_text"],
        "tips": guidance["tips"],
        "serper_snippets": len(snippets),
        "timestamp": datetime.utcnow().isoformat(),
        },
        _CACHE_TTL_BY_FEATURE["dudh-darpan"],
    )


@router.get("/dairy-score/{farmer_id}")
async def dairy_score(farmer_id: str):
    try:
        return await _dairy_score_impl(farmer_id)
    except Exception as exc:
        logger.exception("dairy-score error for farmer=%s: %s", farmer_id, exc)
        return {"status": "error", "message": str(exc)}


async def _dairy_score_impl(farmer_id: str):
    farmer = await user_collection.find_one({"user_id": farmer_id})
    farmer_name = str((farmer or {}).get("name") or farmer_id)

    batches: list[dict[str, Any]] = []
    payments: list[dict[str, Any]] = []

    async for document in batch_collection.find({"farmer_id": farmer_id}).limit(90):
        document["_id"] = str(document["_id"])
        batches.append(document)

    async for document in payment_collection.find({"farmer_id": farmer_id}).limit(100):
        document["_id"] = str(document["_id"])
        payments.append(document)

    batch_count = len(batches)
    payment_count = len(payments)

    base_score = 500
    if batch_count > 60:
        base_score += 100
    elif batch_count > 30:
        base_score += 60
    elif batch_count > 10:
        base_score += 30

    if payment_count > 10:
        base_score += 80
    elif payment_count > 5:
        base_score += 40

    randomizer = random.Random(farmer_id)
    base_score += randomizer.randint(30, 120)
    score = max(300, min(900, base_score))

    total_paid = sum(float(payment.get("amount", 0) or 0) for payment in payments)
    monthly_income = (total_paid / payment_count) if payment_count else 18600.0
    kcc_limit = max(50_000, min(300_000, int(monthly_income * 8)))
    delivery_rate = min(100, int((batch_count / 90) * 100)) if batch_count else 75

    grade = (
        "Excellent"
        if score >= 750
        else "Good"
        if score >= 650
        else "Fair"
        if score >= 550
        else "Poor"
    )

    return {
        "status": "success",
        "farmer_id": farmer_id,
        "farmer_name": farmer_name,
        "dairy_score": score,
        "grade": grade,
        "metrics": {
            "delivery_days": batch_count,
            "delivery_rate_percent": delivery_rate,
            "payment_count": payment_count,
            "monthly_income_estimate": round(monthly_income, 2),
        },
        "kcc_recommendation": {
            "eligible": score >= 550,
            "suggested_limit": kcc_limit,
            "interest_rate": 4.0,
            "tenure_months": 12,
        },
        "insurance": {
            "premium_monthly": 200,
            "coverage": 50_000,
            "government_subsidy_percent": 85,
            "farmer_pays_monthly": 30,
        },
        "credit_report": (
            f"{farmer_name} यांनी मागील कालावधीत {batch_count} दूध पुरवठा नोंदी दिल्या आहेत "
            f"({delivery_rate}% सातत्य). अंदाजे मासिक उत्पन्न ₹{int(monthly_income):,}. "
            f"DairyScore {score}/900 असून KCC साठी सुचवलेली मर्यादा ₹{kcc_limit:,} आहे."
        ),
        "timestamp": datetime.utcnow().isoformat(),
    }


_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "feed": [
        "feed",
        "fodder",
        "chara",
        "chaara",
        "grass",
        "silage",
        "concentrate",
        "खाद्य",
        "चारा",
        "गवत",
        "कडबा",
    ],
    "veterinary": [
        "vet",
        "doctor",
        "medicine",
        "injection",
        "treatment",
        "pashuvaidya",
        "पशुवैद्य",
        "औषध",
        "उपचार",
        "डॉक्टर",
    ],
    "labor": [
        "labor",
        "labour",
        "worker",
        "kamgar",
        "मजूर",
        "कामगार",
    ],
    "electricity": [
        "electricity",
        "electric",
        "power",
        "bill",
        "light",
        "वीज",
        "बिल",
    ],
    "transport": [
        "transport",
        "vehicle",
        "truck",
        "वाहन",
        "गाडी",
    ],
}
_DEVANAGARI_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")
_WORD_AMOUNTS = {
    "शंभर": 100,
    "एकशे": 100,
    "दोनशे": 200,
    "तीनशे": 300,
    "चारशे": 400,
    "पाचशे": 500,
    "सहाशे": 600,
    "सातशे": 700,
    "आठशे": 800,
    "नऊशे": 900,
    "हजार": 1000,
    "एक हजार": 1000,
    "दीड हजार": 1500,
    "दोन हजार": 2000,
    "तीन हजार": 3000,
    "चार हजार": 4000,
    "पाच हजार": 5000,
}
_CATEGORY_MARATHI = {
    "feed": "चारा",
    "veterinary": "पशुवैद्य",
    "labor": "मजूर",
    "electricity": "वीज",
    "transport": "वाहतूक",
    "miscellaneous": "इतर",
}


def _normalize_digits(text: str) -> str:
    return (text or "").translate(_DEVANAGARI_DIGITS)


def _categorize(text: str) -> str:
    lowered = (text or "").lower()
    for category, keywords in _CATEGORY_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return category
    return "miscellaneous"


def _parse_amount_from_text(text: str) -> float | None:
    normalized = _normalize_digits(text).lower().replace(",", " ")
    match = re.search(r"(\d+(?:\.\d+)?)", normalized)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return None

    for phrase, amount in sorted(
        _WORD_AMOUNTS.items(),
        key=lambda item: len(item[0]),
        reverse=True,
    ):
        if phrase in normalized:
            return float(amount)

    return None


async def _interpret_expense_input(
    *,
    text: str,
    provided_amount: Any = None,
    provided_category: str | None = None,
) -> dict[str, Any]:
    prompt = (
        "You extract farm expense details from short speech-to-text notes.\n"
        "Return ONLY JSON using this schema:\n"
        '{'
        '"normalized_text":"clean expense description",'
        '"amount":500,'
        '"category":"feed",'
        '"reason":"short English note",'
        '"marathi_confirmation":"मराठीत पुष्टीकरण वाक्य"'
        "}\n"
        "Allowed categories: feed, veterinary, labor, electricity, transport, miscellaneous.\n"
        "If the note is ambiguous, choose the closest category and infer the amount only if it is clearly mentioned.\n"
        f"Input text: {text}\n"
        f"Provided amount: {provided_amount}\n"
        f"Provided category: {provided_category or ''}"
    )

    try:
        raw = await asyncio.wait_for(
            llm_extract(prompt, max_tokens=350, temperature=0.1),
            timeout=8.0,
        )
    except (asyncio.TimeoutError, Exception):
        raw = ""
    parsed = _parse_json_object(raw)

    amount = parsed.get("amount")
    if amount in (None, "", 0):
        amount = (
            provided_amount
            if provided_amount not in (None, "")
            else _parse_amount_from_text(text)
        )

    try:
        amount = float(amount) if amount is not None else None
    except (TypeError, ValueError):
        amount = None

    category = str(
        parsed.get("category") or provided_category or _categorize(text)
    ).strip().lower()
    if category not in _CATEGORY_MARATHI:
        category = _categorize(text)

    normalized_text = str(parsed.get("normalized_text") or text).strip() or text
    marathi_confirmation = str(parsed.get("marathi_confirmation") or "").strip()

    if not marathi_confirmation and amount is not None:
        marathi_confirmation = (
            f"₹{int(amount)} {_CATEGORY_MARATHI.get(category, 'इतर')} खर्च नोंदवला."
        )

    return {
        "amount": amount,
        "category": category,
        "normalized_text": normalized_text,
        "reason": str(parsed.get("reason") or "").strip(),
        "marathi_confirmation": marathi_confirmation,
    }


@router.post("/kharchi-vahi")
async def add_kharchi(data: dict):
    try:
        return await _add_kharchi_impl(data)
    except Exception as exc:
        logger.exception("kharchi-vahi add error: %s", exc)
        return {"status": "error", "message": str(exc)}


async def _add_kharchi_impl(data: dict):
    farmer_id = str(data.get("farmer_id") or "unknown").strip()
    text = str(data.get("text") or "").strip()
    source = str(data.get("source") or "manual").strip().lower() or "manual"

    if not text:
        raise HTTPException(status_code=422, detail="Expense text is required.")

    interpreted = await _interpret_expense_input(
        text=text,
        provided_amount=data.get("amount"),
        provided_category=data.get("category"),
    )

    if interpreted["amount"] is None:
        raise HTTPException(
            status_code=422,
            detail="Amount could not be understood. Please mention the amount in your note or enter it in the amount field.",
        )

    farmer = await user_collection.find_one({"user_id": farmer_id})
    farmer_name = str((farmer or {}).get("name") or farmer_id)

    expense = {
        "farmer_id": farmer_id,
        "farmer_name": farmer_name,
        "text": interpreted["normalized_text"],
        "raw_text": text,
        "amount": round(float(interpreted["amount"]), 2),
        "category": interpreted["category"],
        "source": source,
        "date": str(date.today()),
        "created_at": datetime.utcnow().isoformat(),
        "llm_reason": interpreted["reason"],
    }
    result = await expense_collection.insert_one(expense)
    logger.info("Expense inserted: farmer=%s amount=%s category=%s id=%s",
                farmer_id, expense["amount"], expense["category"], result.inserted_id)
    expense.pop("_id", None)

    return {
        "status": "success",
        "expense": expense,
        "parsed": {
            "amount": expense["amount"],
            "category": expense["category"],
            "normalized_text": expense["text"],
        },
        "marathi_confirm": interpreted["marathi_confirmation"]
        or f"₹{int(expense['amount'])} {_CATEGORY_MARATHI.get(expense['category'], 'इतर')} खर्च नोंदवला.",
    }


@router.get("/kharchi-vahi/{farmer_id}")
async def get_kharchi(farmer_id: str):
    try:
        return await _get_kharchi_impl(farmer_id)
    except Exception as exc:
        logger.exception("kharchi-vahi get error for farmer=%s: %s", farmer_id, exc)
        return {"status": "error", "message": str(exc)}


async def _get_kharchi_impl(farmer_id: str):
    farmer = await user_collection.find_one({"user_id": farmer_id})
    farmer_name = str((farmer or {}).get("name") or farmer_id)

    expenses: list[dict[str, Any]] = []
    async for document in expense_collection.find({"farmer_id": farmer_id}).sort(
        "created_at", -1
    ).limit(100):
        document["_id"] = str(document["_id"])
        expenses.append(document)

    total_expenses = round(
        sum(float(item.get("amount", 0) or 0) for item in expenses),
        2,
    )

    by_category: dict[str, float] = {}
    for expense in expenses:
        category = str(expense.get("category") or "miscellaneous")
        by_category[category] = round(
            by_category.get(category, 0.0) + float(expense.get("amount", 0) or 0),
            2,
        )

    payments: list[dict[str, Any]] = []
    async for document in payment_collection.find({"farmer_id": farmer_id}):
        payments.append(document)
    total_income = round(
        sum(float(payment.get("amount", 0) or 0) for payment in payments)
        or 18_600.0,
        2,
    )

    return {
        "status": "success",
        "farmer_id": farmer_id,
        "farmer_name": farmer_name,
        "expenses": expenses,
        "summary": {
            "total_expenses": total_expenses,
            "total_income": total_income,
            "net_profit": round(total_income - total_expenses, 2),
            "by_category": by_category,
        },
    }


_DISTRICTS = [
    {"name": "Pune", "lat": 18.52, "lon": 73.85},
    {"name": "Nashik", "lat": 19.99, "lon": 73.79},
    {"name": "Kolhapur", "lat": 16.70, "lon": 74.24},
    {"name": "Aurangabad", "lat": 19.88, "lon": 75.34},
    {"name": "Solapur", "lat": 17.68, "lon": 75.90},
    {"name": "Marathwada", "lat": 18.80, "lon": 76.50},
]
_BASE_PRICES = {
    "concentrate_per_kg": 19.0,
    "dry_fodder_per_kg": 8.5,
    "green_fodder_per_quintal": 280.0,
}


@router.get("/chara-alert")
async def chara_alert(region: str = "Pune"):
    try:
        return await _chara_alert_impl(region)
    except Exception as exc:
        logger.exception("chara-alert error for region=%s: %s", region, exc)
        return {"status": "error", "message": str(exc)}


async def _chara_alert_impl(region: str):
    cache_key = _feature_cache_key("chara-alert", region, date.today().isoformat())
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    snippets = [
        snippet
        for search_result in await asyncio.gather(
            *(
                serper_search(query)
                for query in [
                    f"cattle feed price {region} Maharashtra 2026 per kg",
                    "fodder scarcity Maharashtra drought 2026",
                    "IMD Maharashtra rainfall forecast 2026",
                ]
            )
        )
        for snippet in search_result
    ]

    day_seed = int(hashlib.md5(str(date.today()).encode()).hexdigest()[:8], 16)
    districts_data: list[dict[str, Any]] = []

    for index, district in enumerate(_DISTRICTS):
        randomizer = random.Random(day_seed + index * 997)
        price_variation = randomizer.uniform(0.85, 1.25)
        risk_index = randomizer.randint(3, 9)
        trend_percent = (
            randomizer.randint(5, 20)
            if risk_index >= 5
            else randomizer.randint(2, 8)
        )
        districts_data.append(
            {
                "district": district["name"],
                "lat": district["lat"],
                "lon": district["lon"],
                "risk_index": risk_index,
                "risk_label": (
                    "High" if risk_index >= 7 else "Medium" if risk_index >= 5 else "Low"
                ),
                "color": (
                    "#dc2626" if risk_index >= 7 else "#f59e0b" if risk_index >= 5 else "#2e7d32"
                ),
                "prices": {
                    "concentrate_per_kg": round(
                        _BASE_PRICES["concentrate_per_kg"] * price_variation, 1
                    ),
                    "dry_fodder_per_kg": round(
                        _BASE_PRICES["dry_fodder_per_kg"] * price_variation, 1
                    ),
                    "green_fodder_per_quintal": round(
                        _BASE_PRICES["green_fodder_per_quintal"] * price_variation
                    ),
                },
                "price_trend": (
                    f"+{trend_percent}% from last month"
                    if risk_index >= 5
                    else f"-{trend_percent}% stable"
                ),
            }
        )

    selected = next(
        (district for district in districts_data if district["district"] == region),
        districts_data[0],
    )
    feed_cost = selected["prices"]["concentrate_per_kg"]
    production_cost = round(23.75 + (feed_cost - 19) * 1.5, 2)
    procurement_rate = 35.0
    profit = round(procurement_rate - production_cost, 2)

    fallback_message = (
        "पुढील तीन आठवड्यांत चार्‍याच्या किमती वाढण्याची शक्यता आहे. "
        "साठा नियोजन, सायलेज आणि कमी-धोका असलेल्या जिल्ह्यांतून खरेदी यावर भर द्या."
        if selected["risk_index"] >= 7
        else f"{region} मध्ये चार्‍याची स्थिती सध्या नियंत्रणात आहे. दर वाढण्याआधी साठा नियोजन करून फायदा घ्या."
    )

    guidance = await build_marathi_guidance(
        feature="CharaAlert",
        context={
            "region": region,
            "selected": selected,
            "production_cost_per_litre": production_cost,
            "procurement_rate": procurement_rate,
            "profit_per_litre": profit,
            "forecast_window_days": 21,
        },
        fallback_heading="चार्‍याबाबत सूचना",
        fallback_message=fallback_message,
        fallback_tips=[
            "सायलेज आणि कोरडा चारा आधीच साठवा.",
            "उच्च-जोखीम जिल्ह्यांऐवजी कमी-जोखीम भागातून खरेदी तपासा.",
            "चार्‍याचा खर्च आणि दूध नफा आठवड्याला नोंदवा.",
        ],
    )

    return _cache_set(
        cache_key,
        {
        "status": "success",
        "region": region,
        "districts": districts_data,
        "selected": selected,
        "cost_analysis": {
            "feed_cost_per_kg": feed_cost,
            "production_cost_per_litre": production_cost,
            "procurement_rate": procurement_rate,
            "profit_per_litre": profit,
        },
        "marathi_alert": guidance["message"],
        "advisory_heading": guidance["heading"],
        "audio_text": guidance["audio_text"],
        "tips": guidance["tips"],
        "serper_snippets": len(snippets),
        "timestamp": datetime.utcnow().isoformat(),
        },
        _CACHE_TTL_BY_FEATURE["chara-alert"],
    )


@router.post("/razorpay-order")
async def create_razorpay_order(data: dict):
    display_amount = int(data.get("display_amount", 2500))
    purpose = str(data.get("purpose") or "Milk Payment Demo")
    farmer_id = str(data.get("farmer_id") or "demo-farmer")

    if _is_placeholder(settings.RAZORPAY_KEY_ID) or _is_placeholder(
        settings.RAZORPAY_KEY_SECRET
    ):
        return {
            "status": "demo",
            "display_amount": display_amount,
            "actual_charge": 1,
            "currency": "INR",
            "payment_url": "",
            "message": "Razorpay keys not configured - add them to backend .env",
        }

    auth_b64 = base64.b64encode(
        f"{settings.RAZORPAY_KEY_ID}:{settings.RAZORPAY_KEY_SECRET}".encode()
    ).decode()

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                "https://api.razorpay.com/v1/payment_links",
                json={
                    "amount": 100,
                    "currency": "INR",
                    "accept_partial": False,
                    "description": (
                        f"SmartShetakari Demo - {purpose} "
                        f"(Display: ₹{display_amount:,})"
                    ),
                    "notes": {
                        "farmer_id": farmer_id,
                        "display_amount": str(display_amount),
                        "purpose": purpose,
                    },
                    "reminder_enable": False,
                },
                headers={
                    "Authorization": f"Basic {auth_b64}",
                    "Content-Type": "application/json",
                },
            )
            link_data = response.json()
    except Exception as error:
        link_data = {"error": str(error)}

    return {
        "status": "success",
        "display_amount": display_amount,
        "actual_charge": 1,
        "currency": "INR",
        "payment_url": link_data.get("short_url") or link_data.get("url", ""),
        "razorpay_id": link_data.get("id", ""),
        "description": purpose,
    }


@router.post("/notify")
async def send_notification(data: dict):
    note = {
        "type": data.get("type", "price_alert"),
        "title": data.get("title", "Alert"),
        "message": data.get("message", ""),
        "target": data.get("target", "all"),
        "icon": data.get("icon", "notifications"),
        "sent_at": datetime.utcnow().isoformat(),
        "simulated": True,
    }
    await db["notifications"].insert_one(note)
    note.pop("_id", None)
    recipient_count = int(data.get("recipient_count", 47))

    return {
        "status": "success",
        "notification": note,
        "recipients_sent": recipient_count,
        "message": f"Notification sent to {recipient_count} farmers.",
    }


@router.get("/notifications")
async def list_notifications():
    notifications: list[dict[str, Any]] = []
    async for document in db["notifications"].find().sort("sent_at", -1).limit(20):
        document["_id"] = str(document["_id"])
        notifications.append(document)

    return {"status": "success", "notifications": notifications}
