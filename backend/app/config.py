from functools import lru_cache

from pydantic import ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="ignore")

    app_name: str = "HireFlow"
    app_env: str = "development"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5433/hireflow"
    redis_url: str = "redis://localhost:6380/0"
    jwt_secret: str = "change-me-in-production"
    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"
    llm_base_url: str = ""
    llm_provider: str = "openai-compatible"
    gemini_api_key: str = ""
    gemini_model: str = "models/gemini-3-flash-preview"
    gemini_use_google_search: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
from functools import lru_cache

from pydantic import ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="ignore")

    app_name: str = "HireFlow"
    app_env: str = "development"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5433/hireflow"
    redis_url: str = "redis://localhost:6380/0"
    jwt_secret: str = "change-me-in-production"
    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"
    llm_base_url: str = ""
    llm_provider: str = "openai-compatible"
    gemini_api_key: str = ""
    gemini_model: str = "models/gemini-3-flash-preview"
    gemini_use_google_search: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
from functools import lru_cache

from pydantic import ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="ignore")

    app_name: str = "HireFlow"
    app_env: str = "development"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5433/hireflow"
    redis_url: str = "redis://localhost:6380/0"
    jwt_secret: str = "change-me-in-production"
    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"
    llm_base_url: str = ""
    llm_provider: str = "openai-compatible"
    gemini_api_key: str = ""
    gemini_model: str = "models/gemini-3-flash-preview"
    gemini_use_google_search: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
