from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    chat_id: str = ""
    farmer_id: str = ""
    language: str = "en"
    history: list[dict[str, str]] = Field(default_factory=list)


class GenerateJSONRequest(BaseModel):
    prompt: str = Field(min_length=1)


class CreateChatRequest(BaseModel):
    farmer_id: str = ""
    language: str = "en"
    title: str = "New Chat"
    welcome_text: str = ""
