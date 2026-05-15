"""
voice.py — /api/voice router
─────────────────────────────
POST /api/voice/query
  • Accepts: multipart/form-data  { file: <audio>, farmer_id: <str> }
  • Returns: JSON with transcript + intent + TTS text

POST /api/voice/save-expense
  • Accepts: JSON  { farmer_id, amount, category, description, transcript }
  • Returns: { status, message }

GET /api/voice/health
  • Quick liveness check (no auth needed)
"""

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from app.core.database import expense_collection
from app.services.voice_service import process_voice_query
from datetime import datetime, timezone

router = APIRouter()


# ── Health ──────────────────────────────────────────────────────────────────
@router.get("/health")
async def voice_health():
    return {"status": "ok", "service": "DairyMitra Voice API"}


# ── Main voice query endpoint ────────────────────────────────────────────────
@router.post("/query")
async def voice_query(
    file: UploadFile = File(...),
    farmer_id: str = Form(default=""),
):
    """
    1. Receive audio file from Expo frontend.
    2. Send to STT → LLM pipeline.
    3. If expense detected, auto-save to DB.
    4. Return { transcript, type, response, amount?, category?, description?, saved? }
    """
    # Read audio bytes
    try:
        audio_bytes = await file.read()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded audio: {exc}",
        )

    if not audio_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded audio file is empty.",
        )

    filename = file.filename or "audio.m4a"

    # Run STT + LLM pipeline
    result = await process_voice_query(
        audio_bytes=audio_bytes,
        filename=filename,
        farmer_id=farmer_id,
    )

    # Auto-save expense to DB if detected and farmer is known
    saved = False
    if result.get("type") == "expense" and farmer_id:
        try:
            expense_doc = {
                "farmer_id": farmer_id,
                "text": result.get("description") or result.get("transcript", ""),
                "amount": result.get("amount") or 0,
                "category": result.get("category", "miscellaneous"),
                "source": "voice_assistant",
                "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "logged_at": datetime.now(timezone.utc),
                "transcript": result.get("transcript", ""),
            }
            await expense_collection.insert_one(expense_doc)
            saved = True
        except Exception:
            # Non-fatal: still return the result even if DB write fails
            saved = False

    result["saved"] = saved
    return JSONResponse(content=result)


# ── Manual expense save (for retry / edit before save) ──────────────────────
@router.post("/save-expense")
async def save_expense(data: dict):
    """
    Frontend can call this to manually save an expense after reviewing the
    voice query result, in case the user wants to edit before confirm.
    """
    farmer_id = data.get("farmer_id", "")
    if not farmer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="farmer_id is required",
        )

    expense_doc = {
        "farmer_id": farmer_id,
        "text": data.get("description") or data.get("transcript", ""),
        "amount": data.get("amount") or 0,
        "category": data.get("category", "miscellaneous"),
        "source": "voice_assistant_manual",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "logged_at": datetime.now(timezone.utc),
        "transcript": data.get("transcript", ""),
    }

    try:
        await expense_collection.insert_one(expense_doc)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save expense: {exc}",
        )

    return {"status": "success", "message": "Expense saved successfully"}
