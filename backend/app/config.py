from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    allowed_origins: str
    database_url: str
    supabase_url: str
    supabase_anon_key: str
    gemini_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("GEMINI_API_KEY", "GOOGLE_API_KEY"),
    )
    embedding_model: str = "gemini-embedding-2"
    embedding_dimension: int = 1536
    llm_model: str = "gemini-3.5-flash-lite"
    allow_mock_fallback: bool = False


settings = Settings()
