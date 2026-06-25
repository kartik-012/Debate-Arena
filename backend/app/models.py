"""
Pydantic models for request validation and response serialization.

Every model mirrors the database schema exactly. Validators enforce
the same constraints as the SQL CHECK clauses so invalid data is
rejected before it ever reaches the database.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Shared enums expressed as Literal-like validators
# ---------------------------------------------------------------------------

_VALID_TONES = {"formal", "casual", "courtroom"}
_VALID_SIDES = {"for", "against"}
_VALID_STATUSES = {"in_progress", "judging", "complete", "error"}
_VALID_ROUNDS = {1, 3, 5}
_VALID_FACT_VERDICTS = {"verified", "unverified", "false"}


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class DebateCreate(BaseModel):
    """Payload to start a new debate."""
    model_config = {"protected_namespaces": ()}

    question: str = Field(
        ...,
        min_length=1,
        max_length=300,
        description="The debate question (max 300 characters).",
    )
    rounds_total: int = Field(
        default=3,
        description="Number of debate rounds (1, 3, or 5).",
    )
    tone: str = Field(
        default="formal",
        description="Debate tone: formal, casual, or courtroom.",
    )
    model_for: str = Field(
        default="Gemini 3.1 Flash Lite",
        description="LLM model for the 'for' side.",
    )
    model_against: str = Field(
        default="Gemini 3.1 Flash Lite",
        description="LLM model for the 'against' side.",
    )
    model_judge: str = Field(
        default="Gemini 3.1 Flash Lite",
        description="LLM model for the judge.",
    )

    @field_validator("rounds_total")
    @classmethod
    def validate_rounds(cls, v: int) -> int:
        if v not in _VALID_ROUNDS:
            raise ValueError(f"rounds_total must be one of {_VALID_ROUNDS}")
        return v

    @field_validator("tone")
    @classmethod
    def validate_tone(cls, v: str) -> str:
        v = v.lower().strip()
        if v not in _VALID_TONES:
            raise ValueError(f"tone must be one of {_VALID_TONES}")
        return v


# ---------------------------------------------------------------------------
# Response models — mirror every column in the database
# ---------------------------------------------------------------------------


class DebateResponse(BaseModel):
    """Full debate record."""
    model_config = {"protected_namespaces": ()}

    id: str
    question: str
    status: str
    rounds_total: int
    tone: str
    model_for: str
    model_against: str
    model_judge: str
    winning_side: Optional[str] = None
    parent_debate_id: Optional[str] = None
    gemini_calls_used: int = 0
    autopsy: Optional[str] = None
    error_message: Optional[str] = None
    created_at: str
    updated_at: str


class DebateTurnResponse(BaseModel):
    """Single debate turn (argument)."""

    id: str
    debate_id: str
    side: str
    round_number: int
    content: str
    strength_score: Optional[float] = None
    is_user_submitted: bool
    created_at: str


class JudgeVerdictResponse(BaseModel):
    """Judge verdict for a debate."""

    id: str
    debate_id: str
    winning_side: str
    reasoning: str
    persona: str
    is_order_swapped: bool
    created_at: str


class FactCheckResponse(BaseModel):
    """Fact-check result for a claim within a turn."""

    id: str
    turn_id: str
    claim_text: str
    verdict: str
    source_url: Optional[str] = None
    explanation: Optional[str] = None
    created_at: str


class ConsistencyFlagResponse(BaseModel):
    """Flag indicating a contradiction between two turns."""

    id: str
    turn_id: str
    contradicts_turn_id: str
    explanation: str
    created_at: str


class PersonaVoteResponse(BaseModel):
    """Vote from a single persona judge."""

    id: str
    debate_id: str
    persona_name: str
    voted_side: str
    reasoning: str
    created_at: str


class BiasReportResponse(BaseModel):
    """Position-bias detection report for a debate."""

    id: str
    debate_id: str
    original_winner: str
    swapped_winner: str
    bias_detected: bool
    explanation: Optional[str] = None
    created_at: str


# ---------------------------------------------------------------------------
# Composite / list responses
# ---------------------------------------------------------------------------


class DebateDetailResponse(BaseModel):
    """
    Rich debate view with all related entities.

    Returned by the GET /debate/{id} endpoint.
    """

    debate: DebateResponse
    turns: list[DebateTurnResponse] = []
    verdicts: list[JudgeVerdictResponse] = []
    fact_checks: list[FactCheckResponse] = []
    consistency_flags: list[ConsistencyFlagResponse] = []
    persona_votes: list[PersonaVoteResponse] = []
    bias_report: Optional[BiasReportResponse] = None


class DebateListResponse(BaseModel):
    """Paginated list of debates for the history view."""

    debates: list[DebateResponse] = []
    total: int = 0


# ---------------------------------------------------------------------------
# Error
# ---------------------------------------------------------------------------


class ErrorResponse(BaseModel):
    """Standard error payload."""

    detail: str
