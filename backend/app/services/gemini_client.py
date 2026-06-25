import asyncio
import time
import random
import hashlib
import json
from typing import Any, List, Dict, Optional
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

class GeminiQuotaExceeded(Exception):
    """Exception raised when the Gemini API quota is exhausted after backoff retries."""
    pass

class TokenBucket:
    def __init__(self, capacity: float, fill_rate: float):
        """
        capacity: max tokens in the bucket.
        fill_rate: tokens per second added.
        """
        self.capacity = capacity
        self.fill_rate = fill_rate
        self.tokens = capacity
        self.last_update = time.time()
        self.lock = asyncio.Lock()

    async def consume(self, tokens: float = 1.0) -> float:
        async with self.lock:
            now = time.time()
            elapsed = now - self.last_update
            self.last_update = now
            self.tokens = min(self.capacity, self.tokens + elapsed * self.fill_rate)
            
            if self.tokens < tokens:
                needed = tokens - self.tokens
                wait_time = needed / self.fill_rate
                self.tokens -= tokens
                return wait_time
            else:
                self.tokens -= tokens
                return 0.0

# Rate limits config. Free tier limits: 15 RPM, 1500 RPD
RPM_LIMIT = settings.GEMINI_RPM_LIMIT
RPD_LIMIT = settings.GEMINI_RPD_LIMIT

_rpm_bucket = TokenBucket(float(RPM_LIMIT), float(RPM_LIMIT) / 60.0)
_rpd_bucket = TokenBucket(float(RPD_LIMIT), float(RPD_LIMIT) / 86400.0)

# Global in-memory cache for judge, autopsy, bias, persona calls
_cache: Dict[str, str] = {}

def _get_cache_key(model: str, system_prompt: str, messages: List[Dict[str, str]], temperature: float, response_schema: Any = None) -> str:
    serialized_messages = json.dumps(messages, sort_keys=True)
    serialized_schema = str(response_schema) if response_schema else ""
    key_str = f"{model}:{system_prompt}:{serialized_messages}:{temperature}:{serialized_schema}"
    return hashlib.sha256(key_str.encode("utf-8")).hexdigest()

def _format_messages_for_gemini(messages: List[Dict[str, str]]) -> List[Dict[str, Any]]:
    """Format messages to alternate user and model roles. Merges adjacent identical roles."""
    formatted = []
    for m in messages:
        role = "user" if m["role"] == "user" else "model"
        content = m["content"]
        if formatted and formatted[-1]["role"] == role:
            formatted[-1]["parts"][0] += f"\n\n{content}"
        else:
            formatted.append({"role": role, "parts": [content]})
    return formatted

async def _increment_debate_budget(debate_id: str):
    """Safely increments the gemini_calls_used column for the debate in the DB."""
    from app.database import get_db, execute_query
    try:
        async with get_db() as db:
            await execute_query(
                db, 
                "UPDATE debates SET gemini_calls_used = gemini_calls_used + 1 WHERE id = ?", 
                (debate_id,)
            )
    except Exception as e:
        logger.error("Failed to increment debate budget for %s: %s", debate_id, e)

def get_quota_info() -> Dict[str, Any]:
    """Returns the current state of rate limiter buckets."""
    return {
        "rpm_limit": RPM_LIMIT,
        "rpm_available": max(0.0, _rpm_bucket.tokens),
        "rpd_limit": RPD_LIMIT,
        "rpd_available": max(0.0, _rpd_bucket.tokens),
    }

async def generate_response(
    model_name: str,
    system_prompt: str,
    messages: List[Dict[str, str]],
    temperature: float = 0.7,
    response_schema: Any = None,
    use_cache: bool = False,
    debate_id: Optional[str] = None
) -> str:
    """
    Queue-safe client invocation of Gemini with exponential backoff on 429.
    Tracks budget column when debate_id is provided.
    """
    # 1. Check in-memory cache
    cache_key = _get_cache_key(model_name, system_prompt, messages, temperature, response_schema)
    if use_cache and cache_key in _cache:
        logger.info("Cache hit for model=%s (debate_id=%s)", model_name, debate_id)
        return _cache[cache_key]

    # 2. Token bucket check (RPM & RPD limiters)
    wait_rpm = await _rpm_bucket.consume(1.0)
    wait_rpd = await _rpd_bucket.consume(1.0)
    wait_time = max(wait_rpm, wait_rpd)

    if wait_time > 0:
        logger.warning(
            "Gemini rate limit threshold reached. Delaying request for %.2f seconds (model=%s, debate_id=%s)...",
            wait_time, model_name, debate_id
        )
        await asyncio.sleep(wait_time)

    # 3. Call generation with retry block
    generation_config = genai.types.GenerationConfig(
        temperature=temperature
    )
    if response_schema:
        generation_config.response_mime_type = "application/json"
        generation_config.response_schema = response_schema

    max_retries = 3
    base_delay = 2.0

    for attempt in range(max_retries + 1):
        try:
            if not settings.GOOGLE_API_KEY:
                logger.warning("Google API Key missing. Returning mock response.")
                await asyncio.sleep(1)
                mock_res = "[Mock Gemini Response] Google API Key is missing. This mock response acts as a placeholder."
                if use_cache:
                    _cache[cache_key] = mock_res
                if debate_id:
                    asyncio.create_task(_increment_debate_budget(debate_id))
                return mock_res

            # Configure and instantiate model
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            model = genai.GenerativeModel(model_name, system_instruction=system_prompt)
            formatted_contents = _format_messages_for_gemini(messages)

            response = await model.generate_content_async(
                contents=formatted_contents,
                generation_config=generation_config
            )

            result_text = response.text

            # Update cache if requested
            if use_cache:
                _cache[cache_key] = result_text

            # Increment call budget
            if debate_id:
                asyncio.create_task(_increment_debate_budget(debate_id))

            return result_text

        except Exception as e:
            error_str = str(e)
            is_429 = "429" in error_str or "ResourceExhausted" in error_str or "quota" in error_str.lower()
            
            if is_429 and attempt < max_retries:
                # Exponential backoff + jitter: delay = base_delay * 2^attempt + rand(0, 1)
                delay = (base_delay * (2 ** attempt)) + random.random()
                logger.warning(
                    "Gemini API rate limited (429 ResourceExhausted) on attempt %d/%d. Waiting %.2fs before retry...",
                    attempt + 1, max_retries + 1, delay
                )
                await asyncio.sleep(delay)
            else:
                if is_429:
                    logger.error("Gemini API rate limit fully exhausted after %d attempts.", max_retries + 1)
                    raise GeminiQuotaExceeded("Gemini rate limit reached. Please try again later.")
                else:
                    logger.error("Gemini API call failed: %s", e)
                    raise e
