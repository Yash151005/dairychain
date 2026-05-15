from fastapi import APIRouter, HTTPException

from app.schemas.ai_schema import ChatRequest, CreateChatRequest, GenerateJSONRequest
from app.services.db_service import (
    append_chat_messages,
    create_chat_session,
    get_chat_session,
    list_chat_sessions,
)
from app.services.ai_service import generate_json, generate_reply

router = APIRouter()


def _build_chat_prompt(data: ChatRequest) -> str:
    lines = [
        "You are answering a farmer support chat.",
        f"Preferred language: {data.language or 'en'}.",
    ]

    if data.farmer_id:
        lines.append(f"Farmer ID: {data.farmer_id}.")

    if data.history:
        lines.append("Recent conversation:")
        for item in data.history[-6:]:
            role = (item.get("role") or "").strip().lower()
            text = (item.get("text") or item.get("fallbackText") or "").strip()
            if role and text:
                lines.append(f"- {role}: {text}")

    lines.append(f"Current question: {data.message}")
    return "\n".join(lines)


def _build_chat_title(text: str) -> str:
    cleaned = " ".join((text or "").split())
    if not cleaned:
        return "New Chat"
    if len(cleaned) <= 48:
        return cleaned
    return f"{cleaned[:45].rstrip()}..."


@router.post("/chats")
async def create_chat_route(data: CreateChatRequest):
    welcome_text = (data.welcome_text or "").strip()
    messages = []

    if welcome_text:
        messages.append({"role": "bot", "text": welcome_text})

    chat = await create_chat_session(
        farmer_id=data.farmer_id,
        language=data.language,
        title=data.title,
        messages=messages,
    )

    return {"status": "success", "chat": chat}


@router.get("/chats/{farmer_id}")
async def list_chats_route(farmer_id: str):
    chats = await list_chat_sessions(farmer_id)
    return {"status": "success", "chats": chats}


@router.get("/chats/session/{chat_id}")
async def get_chat_route(chat_id: str, farmer_id: str = ""):
    chat = await get_chat_session(chat_id, farmer_id or None)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    return {"status": "success", "chat": chat}


@router.post("/chat")
async def chat(data: ChatRequest):
    existing_chat = None
    history = list(data.history or [])

    if data.chat_id:
        existing_chat = await get_chat_session(data.chat_id, data.farmer_id or None)
        if not existing_chat:
            raise HTTPException(status_code=404, detail="Chat session not found.")

        if not history:
            history = [
                {"role": message.get("role", ""), "text": message.get("text", "")}
                for message in existing_chat.get("messages", [])[-6:]
                if message.get("text")
            ]

    prompt = _build_chat_prompt(
        ChatRequest(
            message=data.message,
            chat_id=data.chat_id,
            farmer_id=data.farmer_id,
            language=data.language,
            history=history,
        )
    )

    reply = await generate_reply(prompt)

    chat_id = data.chat_id
    if not chat_id:
        created_chat = await create_chat_session(
            farmer_id=data.farmer_id,
            language=data.language,
            title=_build_chat_title(data.message),
        )
        chat_id = created_chat["id"]

    chat = await append_chat_messages(
        chat_id,
        [
            {"role": "user", "text": data.message},
            {"role": "bot", "text": reply},
        ],
        language=data.language,
        title=_build_chat_title(data.message),
    )

    if not chat:
        raise HTTPException(status_code=500, detail="Unable to save chat messages.")

    return {
        "status": "success",
        "reply": reply,
        "chat_id": chat_id,
        "chat": chat,
    }


@router.post("/generate-json")
async def generate_json_route(data: GenerateJSONRequest):
    result = await generate_json(data.prompt)
    return {"status": "success", "result": result}

@router.post("/query-data")
async def query_data(data: dict):
    farmer_id = data.get("farmer_id")
    from app.services.db_service import get_batch, get_expenses_by_farmer
    expenses = await get_expenses_by_farmer(farmer_id)
    return {"status": "success", "result": expenses}
