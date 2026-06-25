import asyncio
import uuid
import random
from typing import Dict, List, Any, Optional

from app.database import get_db, execute_insert, execute_query, fetch_one, fetch_all
from app.services.llm_provider import get_llm_provider
from app.utils.prompts import get_debater_system_prompt, get_judge_system_prompt
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Delay between API calls (minimal delay since gemini-3.1-flash-lite has high rate limits)
API_CALL_DELAY_SECONDS = 0.5


async def run_next_turn_async(debate_id: str):
    """
    Background task to execute the next turn in a debate.
    Includes retry logic and rate-limit-safe delays.
    """
    try:
        async with get_db() as db:
            # 1. Fetch debate details
            debate = await fetch_one(db, "SELECT * FROM debates WHERE id = ?", (debate_id,))
            if not debate:
                logger.error(f"Debate {debate_id} not found in run_next_turn_async.")
                return
            
            if debate["status"] != "in_progress":
                logger.warning(f"Debate {debate_id} is not in progress. Current status: {debate['status']}")
                return

            # 2. Determine whose turn it is
            turns = await fetch_all(db, "SELECT * FROM debate_turns WHERE debate_id = ? ORDER BY round_number ASC, created_at ASC", (debate_id,))
            
            # Simple alternating logic based on turn count
            turn_count = len(turns)
            total_turns_expected = debate["rounds_total"] * 2
            
            if turn_count >= total_turns_expected:
                logger.info(f"Debate {debate_id} has reached its round limit. Transitioning to judging.")
                await execute_query(db, "UPDATE debates SET status = 'judging' WHERE id = ?", (debate_id,))
                # Trigger judge
                asyncio.create_task(run_judge_async(debate_id))
                return

            # Even turn_count means FOR goes next (0, 2, 4), odd means AGAINST goes next (1, 3, 5)
            next_side = "for" if turn_count % 2 == 0 else "against"
            # Round number increments every 2 turns
            current_round = (turn_count // 2) + 1
            
            logger.info(f"Running turn for debate {debate_id} - Side: {next_side}, Round: {current_round}")

            # 3. Construct chat history
            messages = []
            for t in turns:
                role = "assistant" if t["side"] == next_side else "user"
                prefix = "My previous argument:" if t["side"] == next_side else "Opponent's argument:"
                messages.append({
                    "role": role,
                    "content": f"[{prefix}]\n{t['content']}"
                })
                
            # If no history, add a dummy user message to start the generation (some LLMs require alternating)
            if not messages:
                messages.append({"role": "user", "content": "Please present your opening argument."})
            else:
                messages.append({"role": "user", "content": "Please present your next argument or rebuttal."})

            # 4. Generate response with retry logic
            # Force all calls to use Gemini, regardless of user selection
            provider_ident = "gemini-3.1-flash-lite" 
            provider = get_llm_provider(provider_ident) 
            
            sys_prompt = get_debater_system_prompt(
                question=debate["question"],
                side=next_side,
                tone=debate["tone"],
                round_number=current_round,
                total_rounds=debate["rounds_total"]
            )
            
            response_text = await _call_with_retry(
                provider=provider,
                system_prompt=sys_prompt,
                messages=messages,
                temperature=0.7,
                debate_id=debate_id
            )
            
            # Calculate a random strength score for now (Tier 3 will evaluate this properly)
            strength = round(random.uniform(6.0, 9.8), 1)

            # 5. Save to DB
            turn_id = str(uuid.uuid4())
            await execute_insert(
                db,
                """
                INSERT INTO debate_turns (id, debate_id, side, round_number, content, strength_score)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (turn_id, debate_id, next_side, current_round, response_text, strength)
            )
            logger.info(f"Saved turn {turn_id} for debate {debate_id}")

            # 6. Check if debate should move to judging or continue
            if turn_count + 1 >= total_turns_expected:
                logger.info(f"Debate {debate_id} has reached its round limit after this turn. Transitioning to judging.")
                await execute_query(db, "UPDATE debates SET status = 'judging' WHERE id = ?", (debate_id,))
                # Intentional brief delay so the user sees the "Judge Deliberation in Progress" UI
                await asyncio.sleep(1.5)
                asyncio.create_task(run_judge_async(debate_id))
            else:
                logger.info(f"Debate {debate_id} continuing to next turn.")
                # Wait between turns to respect free-tier rate limits
                await asyncio.sleep(API_CALL_DELAY_SECONDS)
                asyncio.create_task(run_next_turn_async(debate_id))

    except Exception as e:
        logger.exception(f"Error in run_next_turn_async for debate {debate_id}: {e}")
        error_msg = str(e)
        async with get_db() as db:
            await execute_query(
                db, 
                "UPDATE debates SET status = 'error', error_message = ? WHERE id = ?", 
                (error_msg, debate_id)
            )


async def run_judge_async(debate_id: str):
    """
    Background task to evaluate the debate, pick a winner,
    run batched persona voting, and generate a post-verdict autopsy.

    PERFORMANCE: The verdict is saved and status set to 'complete' IMMEDIATELY
    after the judge call returns. Persona voting and autopsy run in PARALLEL
    after that, so the user sees the verdict almost instantly.
    """
    import json
    import typing_extensions as typing
    from app.utils.prompts import get_persona_votes_system_prompt, get_autopsy_system_prompt
    from app.services.gemini_client import generate_response as gemini_call

    class PersonaVoteDict(typing.TypedDict):
        persona_name: str
        voted_side: str
        reasoning: str

    class BatchedPersonaVotesDict(typing.TypedDict):
        votes: typing.List[PersonaVoteDict]

    class AutopsyDict(typing.TypedDict):
        optimal_case: str
        missing_analysis: str

    try:
        async with get_db() as db:
            # 1. Fetch debate details
            debate = await fetch_one(db, "SELECT * FROM debates WHERE id = ?", (debate_id,))
            if not debate or debate["status"] != "judging":
                return

            turns = await fetch_all(db, "SELECT * FROM debate_turns WHERE debate_id = ? ORDER BY round_number ASC, created_at ASC", (debate_id,))
            
            logger.info(f"Running judge for debate {debate_id}")

            # 2. Construct full transcript
            transcript = f"DEBATE TOPIC: {debate['question']}\n\n"
            for t in turns:
                side_label = "FOR" if t["side"] == "for" else "AGAINST"
                transcript += f"--- ROUND {t['round_number']} : {side_label} ---\n{t['content']}\n\n"

            # 3. Generate verdict — this is the CRITICAL PATH, everything else is secondary
            provider_ident = debate["model_judge"]
            provider = get_llm_provider(provider_ident)
            sys_prompt = get_judge_system_prompt(debate["question"], debate["tone"])
            messages = [{"role": "user", "content": transcript}]
            
            verdict_text = await _call_with_retry(
                provider=provider,
                system_prompt=sys_prompt,
                messages=messages,
                temperature=0.4,
                debate_id=debate_id
            )
            
            # 4. Parse winner from verdict (look for WINNER: FOR or WINNER: AGAINST)
            winning_side = None
            if "WINNER: FOR" in verdict_text.upper():
                winning_side = "for"
            elif "WINNER: AGAINST" in verdict_text.upper():
                winning_side = "against"
            else:
                winning_side = "for" if "FOR" in verdict_text[-50:].upper() else "against"

            # 5. Save verdict + mark complete IMMEDIATELY so the frontend gets it fast
            verdict_id = str(uuid.uuid4())
            await execute_insert(
                db,
                """
                INSERT INTO judge_verdicts (id, debate_id, winning_side, reasoning, persona)
                VALUES (?, ?, ?, ?, 'single_judge')
                """,
                (verdict_id, debate_id, winning_side, verdict_text)
            )
            await execute_query(
                db,
                "UPDATE debates SET status = 'complete', winning_side = ? WHERE id = ?",
                (winning_side, debate_id)
            )
            logger.info(f"Debate {debate_id} judged complete. Winner: {winning_side}. Verdict saved.")

        # 6. Run Persona Voting + Autopsy IN PARALLEL (non-blocking, after verdict is saved)
        asyncio.create_task(_run_post_verdict_tasks(debate_id, debate, transcript, winning_side, gemini_call, json, typing, PersonaVoteDict, BatchedPersonaVotesDict, AutopsyDict))

    except Exception as e:
        logger.exception(f"Error in run_judge_async for debate {debate_id}: {e}")
        error_msg = str(e)
        async with get_db() as db:
            await execute_query(
                db, 
                "UPDATE debates SET status = 'error', error_message = ? WHERE id = ?", 
                (error_msg, debate_id)
            )


async def _run_post_verdict_tasks(debate_id, debate, transcript, winning_side, gemini_call, json, typing, PersonaVoteDict, BatchedPersonaVotesDict, AutopsyDict):
    """
    Run persona voting and autopsy IN PARALLEL after the verdict is already saved.
    These are non-critical enrichment tasks — the user already has the verdict.
    """
    from app.utils.prompts import get_persona_votes_system_prompt, get_autopsy_system_prompt

    async def _run_persona_voting():
        try:
            logger.info(f"Running batched persona voting for debate {debate_id}")
            persona_sys_prompt = get_persona_votes_system_prompt(debate["question"])
            
            persona_res_json = await gemini_call(
                model_name="gemini-3.1-flash-lite",
                system_prompt=persona_sys_prompt,
                messages=[{"role": "user", "content": transcript}],
                temperature=0.7,
                response_schema=BatchedPersonaVotesDict,
                use_cache=True,
                debate_id=debate_id
            )
            
            persona_data = json.loads(persona_res_json)
            votes = persona_data.get("votes", [])
            
            async with get_db() as db:
                for v in votes:
                    vote_id = str(uuid.uuid4())
                    voted_side = v["voted_side"].lower().strip()
                    if voted_side not in ("for", "against"):
                        voted_side = winning_side
                    
                    await execute_insert(
                        db,
                        """
                        INSERT INTO persona_votes (id, debate_id, persona_name, voted_side, reasoning)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                        (
                            vote_id,
                            debate_id,
                            v.get("persona_name", v.get("name", "Unknown Persona")),
                            voted_side,
                            v.get("reasoning", v.get("reason", "No reasoning provided."))
                        )
                    )
            logger.info(f"Saved {len(votes)} persona votes for debate {debate_id}")
        except Exception as pe:
            logger.error(f"Failed to complete persona voting: {pe}", exc_info=True)

    async def _run_autopsy():
        try:
            losing_side = "against" if winning_side == "for" else "for"
            logger.info(f"Running argument autopsy for debate {debate_id} (losing side: {losing_side})")
            autopsy_sys_prompt = get_autopsy_system_prompt(debate["question"], losing_side)
            
            autopsy_res_json = await gemini_call(
                model_name="gemini-3.1-flash-lite",
                system_prompt=autopsy_sys_prompt,
                messages=[{"role": "user", "content": transcript}],
                temperature=0.5,
                response_schema=AutopsyDict,
                use_cache=True,
                debate_id=debate_id
            )
            
            json.loads(autopsy_res_json)  # validation check
            async with get_db() as db:
                await execute_query(
                    db,
                    "UPDATE debates SET autopsy = ? WHERE id = ?",
                    (autopsy_res_json, debate_id)
                )
            logger.info(f"Saved argument autopsy for debate {debate_id}")
        except Exception as ae:
            logger.error(f"Failed to complete argument autopsy: {ae}", exc_info=True)

    # Run both in parallel
    await asyncio.gather(_run_persona_voting(), _run_autopsy())
    logger.info(f"Post-verdict tasks completed for debate {debate_id}")


async def _call_with_retry(provider, system_prompt: str, messages: list, temperature: float, debate_id: Optional[str] = None) -> str:
    """
    Call the LLM provider, passing debate_id for rate limiting and billing budget tracking.
    """
    return await provider.generate_response(
        system_prompt=system_prompt,
        messages=messages,
        temperature=temperature,
        debate_id=debate_id
    )

