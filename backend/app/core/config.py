from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    MONGO_URI: str
    DB_NAME: str
    AI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    NVIDIA_API_KEY: str = ""
    CLAUDE_API_KEY: str = ""
    AI_API_URL: str = "https://integrate.api.nvidia.com/v1/chat/completions"
    AI_MODEL: str = "meta/llama3-70b-instruct"
    AI_MAX_TOKENS: int = 2048
    AI_TEMPERATURE: float = 0.2
    AI_TOP_P: float = 1.0
    AI_FREQUENCY_PENALTY: float = 0.0
    AI_PRESENCE_PENALTY: float = 0.0
    AI_TIMEOUT_SECONDS: float = 60.0

    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""

    SERPER_API_KEY: str = ""
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


settings = Settings()
