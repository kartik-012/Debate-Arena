import asyncio
import json
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

import google.generativeai as genai
from pydantic import BaseModel, Field

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Core Interface
# ---------------------------------------------------------------------------

class LLMProvider(ABC):
    """Abstract base class for all LLM integrations."""
    
    @abstractmethod
    async def generate_response(
        self, 
        system_prompt: str, 
        messages: List[Dict[str, str]], 
        temperature: float = 0.7
    ) -> str:
        """Generate a text response."""
        pass


# ---------------------------------------------------------------------------
# Gemini Implementation (Primary provider)
# ---------------------------------------------------------------------------

class GeminiProvider(LLMProvider):
    """Provider for Google's Gemini models."""
    
    def __init__(self, model: str = "gemini-3.1-flash-lite"):
        self.model_name = model

    async def generate_response(
        self, 
        system_prompt: str, 
        messages: List[Dict[str, str]], 
        temperature: float = 0.7,
        debate_id: Optional[str] = None
    ) -> str:
        from app.services.gemini_client import generate_response as gemini_call
        return await gemini_call(
            model_name=self.model_name,
            system_prompt=system_prompt,
            messages=messages,
            temperature=temperature,
            use_cache=False,  # Turns are round-unique, do not cache
            debate_id=debate_id
        )


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def get_llm_provider(model_identifier: str) -> LLMProvider:
    """
    Factory function to get the appropriate LLM provider.
    Maps user-facing model names to Google Gemini API model names.
    """
    ident = model_identifier.lower().strip()
    
    if "3.1" in ident:
        model_name = "gemini-3.1-flash-lite"
    elif "2.5" in ident:
        model_name = "gemini-2.5-flash"
    elif "2.0" in ident:
        model_name = "gemini-2.0-flash-lite"
    else:
        # Fallback to the working 3.1 flash lite model
        model_name = "gemini-3.1-flash-lite"
        
    logger.info("Mapping model identifier '%s' to Gemini model '%s'", model_identifier, model_name)
    return GeminiProvider(model=model_name)
