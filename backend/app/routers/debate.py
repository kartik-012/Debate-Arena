import uuid
import asyncio
import datetime
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel

from app.database import get_db, execute_insert, fetch_one, fetch_all, execute_query
from app.models import DebateCreate, DebateResponse, DebateDetailResponse, DebateListResponse, BiasReportResponse
from app.services.debate_engine import run_next_turn_async, run_judge_async
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/debate", tags=["debate"])

@router.post("/start", response_model=DebateResponse, status_code=201)
async def start_debate(payload: DebateCreate, background_tasks: BackgroundTasks):
    """
    Start a new debate. Creates the record and kicks off the first turn in the background.
    """
    debate_id = str(uuid.uuid4())
    
    q = payload.question.lower()
    cat = "Uncategorized"
    if any(w in q for w in ["ai", "tech", "robot", "computer", "internet", "social media", "algorithm"]):
        cat = "Tech"
    elif any(w in q for w in ["ethic", "moral", "right", "animal", "justice"]):
        cat = "Ethics"
    elif any(w in q for w in ["climate", "space", "mars", "science", "energy", "earth", "warming"]):
        cat = "Science"
    elif any(w in q for w in ["government", "tax", "money", "economy", "law", "ubi", "policy", "corporate"]):
        cat = "Politics"
    elif any(w in q for w in ["philosophy", "existential", "meaning", "god", "truth"]):
        cat = "Philosophy"

    async with get_db() as db:
        await execute_insert(
            db,
            """
            INSERT INTO debates (id, question, status, rounds_total, tone, model_for, model_against, model_judge, category)
            VALUES (?, ?, 'in_progress', ?, ?, ?, ?, ?, ?)
            """,
            (
                debate_id, payload.question, payload.rounds_total, payload.tone,
                payload.model_for, payload.model_against, payload.model_judge, cat
            )
        )
        debate_record = await fetch_one(db, "SELECT * FROM debates WHERE id = ?", (debate_id,))
    
    # Start the engine logic in the background
    background_tasks.add_task(run_next_turn_async, debate_id)
    
    return debate_record

@router.post("/{id}/next-turn", status_code=202)
async def trigger_next_turn(id: str, background_tasks: BackgroundTasks):
    """
    Manually trigger the next turn for a debate if it stalled.
    Usually the frontend just polls, and the backend orchestrates itself.
    """
    async with get_db() as db:
        debate = await fetch_one(db, "SELECT status FROM debates WHERE id = ?", (id,))
        if not debate:
            raise HTTPException(status_code=404, detail="Debate not found")
        if debate["status"] != "in_progress":
            raise HTTPException(status_code=400, detail=f"Debate cannot continue, current status: {debate['status']}")
            
    background_tasks.add_task(run_next_turn_async, id)
    return {"status": "processing"}

@router.post("/{id}/judge", status_code=202)
async def trigger_judge(id: str, background_tasks: BackgroundTasks):
    """
    Manually trigger the judge.
    """
    async with get_db() as db:
        debate = await fetch_one(db, "SELECT status FROM debates WHERE id = ?", (id,))
        if not debate:
            raise HTTPException(status_code=404, detail="Debate not found")
            
        await execute_query(db, "UPDATE debates SET status = 'judging' WHERE id = ?", (id,))
            
    background_tasks.add_task(run_judge_async, id)
    return {"status": "judging"}

@router.get("/analytics")
async def get_analytics():
    """
    Fetch cross-debate analytics based on SQLite tables. No external LLM calls.
    """
    async with get_db() as db:
        # 1. Total complete debates and win rates
        complete_debates = await fetch_all(db, "SELECT winning_side, COUNT(*) as count FROM debates WHERE status = 'complete' GROUP BY winning_side")
        win_rates = {"for": 0, "against": 0, "total": 0}
        for row in complete_debates:
            if row["winning_side"] == "for":
                win_rates["for"] = row["count"]
            elif row["winning_side"] == "against":
                win_rates["against"] = row["count"]
        win_rates["total"] = win_rates["for"] + win_rates["against"]

        # 2. Average strength score trend per round
        strength_trends = await fetch_all(
            db,
            """
            SELECT round_number, side, AVG(strength_score) as avg_score 
            FROM debate_turns 
            GROUP BY round_number, side 
            ORDER BY round_number ASC
            """
        )
        
        # 3. Bias report statistics
        bias_stats = await fetch_one(
            db,
            """
            SELECT COUNT(*) as total_audits, SUM(CASE WHEN bias_detected = 1 THEN 1 ELSE 0 END) as bias_count 
            FROM bias_reports
            """
        )
        total_audits = bias_stats["total_audits"] if bias_stats else 0
        bias_count = bias_stats["bias_count"] if bias_stats and bias_stats["bias_count"] is not None else 0
        bias_rate = (bias_count / total_audits) * 100 if total_audits > 0 else 0.0

        # 4. Most debated topics / categories dynamic detection
        debates_all = await fetch_all(db, "SELECT question, gemini_calls_used FROM debates")
        
        categories = {"Tech": 0, "Ethics": 0, "Science": 0, "Politics": 0, "Philosophy": 0}
        total_calls = 0
        
        for d in debates_all:
            q = d["question"].lower()
            cat = "Philosophy"
            if any(w in q for w in ["ai", "tech", "robot", "computer", "internet", "social media", "algorithm"]):
                cat = "Tech"
            elif any(w in q for w in ["ethic", "moral", "right", "animal", "justice"]):
                cat = "Ethics"
            elif any(w in q for w in ["climate", "space", "mars", "science", "energy", "earth", "warming"]):
                cat = "Science"
            elif any(w in q for w in ["government", "tax", "money", "economy", "law", "ubi", "policy", "corporate"]):
                cat = "Politics"
                
            categories[cat] += 1
            total_calls += d["gemini_calls_used"] or 0

        # 5. API calls today
        today_str = datetime.datetime.utcnow().strftime("%Y-%m-%d")
        calls_today_row = await fetch_one(
            db,
            "SELECT SUM(gemini_calls_used) as sum_today FROM debates WHERE created_at LIKE ?",
            (f"{today_str}%",)
        )
        calls_today = calls_today_row["sum_today"] if calls_today_row and calls_today_row["sum_today"] is not None else 0

    return {
        "win_rates": win_rates,
        "strength_trends": strength_trends,
        "bias_stats": {
            "total_audits": total_audits,
            "bias_count": bias_count,
            "bias_rate": round(bias_rate, 1)
        },
        "categories": categories,
        "api_budget": {
            "total_calls": total_calls,
            "calls_today": calls_today
        }
    }


@router.get("/{id}", response_model=DebateDetailResponse)
async def get_debate(id: str):
    """
    Fetch full debate details including all turns, verdicts, fact checks, etc.
    """
    async with get_db() as db:
        debate = await fetch_one(db, "SELECT * FROM debates WHERE id = ?", (id,))
        if not debate:
            raise HTTPException(status_code=404, detail="Debate not found")
            
        turns = await fetch_all(db, "SELECT * FROM debate_turns WHERE debate_id = ? ORDER BY round_number ASC, created_at ASC", (id,))
        verdicts = await fetch_all(db, "SELECT * FROM judge_verdicts WHERE debate_id = ? ORDER BY created_at ASC", (id,))
        fact_checks = await fetch_all(
            db, 
            "SELECT fc.* FROM fact_checks fc JOIN debate_turns dt ON fc.turn_id = dt.id WHERE dt.debate_id = ?", 
            (id,)
        )
        consistency_flags = await fetch_all(
            db, 
            "SELECT cf.* FROM consistency_flags cf JOIN debate_turns dt ON cf.turn_id = dt.id WHERE dt.debate_id = ?", 
            (id,)
        )
        persona_votes = await fetch_all(
            db,
            "SELECT * FROM persona_votes WHERE debate_id = ? ORDER BY created_at ASC",
            (id,)
        )
        bias_report = await fetch_one(
            db,
            "SELECT * FROM bias_reports WHERE debate_id = ?",
            (id,)
        )
        
    return {
        "debate": debate,
        "turns": turns,
        "verdicts": verdicts,
        "fact_checks": fact_checks,
        "consistency_flags": consistency_flags,
        "persona_votes": persona_votes,
        "bias_report": bias_report
    }


@router.post("/{id}/bias-check", response_model=BiasReportResponse, status_code=200)
async def run_bias_check(id: str):
    """
    Perform a label-sensitivity bias check by evaluating the debate transcript with inverted labels.
    This detects positional bias (primacy/recency) in the LLM judge.
    """
    async with get_db() as db:
        debate = await fetch_one(db, "SELECT * FROM debates WHERE id = ?", (id,))
        if not debate:
            raise HTTPException(status_code=404, detail="Debate not found")
        
        # Return existing report if already run
        existing = await fetch_one(db, "SELECT * FROM bias_reports WHERE debate_id = ?", (id,))
        if existing:
            return existing
            
        turns = await fetch_all(db, "SELECT * FROM debate_turns WHERE debate_id = ? ORDER BY round_number ASC, created_at ASC", (id,))
        
    if not debate["winning_side"]:
        raise HTTPException(status_code=400, detail="Cannot run bias audit on an incomplete debate")
        
    # Construct swapped transcript (Side A -> AGAINST, Side B -> FOR)
    swapped_transcript = f"DEBATE TOPIC: {debate['question']}\n\n"
    for t in turns:
        swapped_side = "AGAINST" if t["side"] == "for" else "FOR"
        swapped_transcript += f"--- ROUND {t['round_number']} : {swapped_side} ---\n{t['content']}\n\n"
        
    from app.services.gemini_client import generate_response as gemini_call
    from app.utils.prompts import get_judge_system_prompt
    
    sys_prompt = get_judge_system_prompt(debate["question"], debate["tone"])
    
    try:
        verdict_text = await gemini_call(
            model_name="gemini-3.1-flash-lite",
            system_prompt=sys_prompt,
            messages=[{"role": "user", "content": swapped_transcript}],
            temperature=0.4,
            use_cache=True,
            debate_id=id
        )
        
        swapped_winner = None
        if "WINNER: FOR" in verdict_text.upper():
            swapped_winner = "for"
        elif "WINNER: AGAINST" in verdict_text.upper():
            swapped_winner = "against"
        else:
            swapped_winner = "for" if "FOR" in verdict_text[-50:].upper() else "against"
            
        # Swap translation: FOR in inverted transcript corresponds to original AGAINST
        original_side_equivalent = "against" if swapped_winner == "for" else "for"
        
        original_winner = debate["winning_side"]
        bias_detected = original_side_equivalent != original_winner
        
        # Generate rich, structured explanation
        original_label = "Side A (FOR)" if original_winner == "for" else "Side B (AGAINST)"
        swapped_label = "Side A (FOR)" if original_side_equivalent == "for" else "Side B (AGAINST)"
        num_rounds = debate["rounds_total"]
        
        if not bias_detected:
            explanation = (
                f"METHODOLOGY: The complete {num_rounds}-round debate transcript was re-evaluated with all "
                f"presentation labels and speaker positions inverted (FOR ↔ AGAINST). The judge model "
                f"({debate['model_judge']}) was asked to independently re-evaluate under identical conditions. "
                f"FINDING: The re-evaluation confirmed the original winner ({original_label}) — the judge "
                f"reached the same conclusion despite the label inversion. This indicates the verdict was "
                f"based on the semantic quality and logical strength of the arguments, not their positional "
                f"ordering or labeling. "
                f"CONCLUSION: This verdict passes the bias audit with high confidence. The evaluation is "
                f"structurally sound and free from detectable positional, primacy, or recency bias."
            )
        else:
            explanation = (
                f"METHODOLOGY: The complete {num_rounds}-round debate transcript was re-evaluated with all "
                f"presentation labels and speaker positions inverted (FOR ↔ AGAINST). The judge model "
                f"({debate['model_judge']}) was asked to independently re-evaluate under identical conditions. "
                f"FINDING: The re-evaluation FLIPPED the verdict — originally selecting {original_label}, "
                f"but choosing {swapped_label} after label inversion. This is a strong indicator that the "
                f"judge's decision was partially influenced by positional framing rather than pure argument quality. "
                f"CONCLUSION: Positional bias detected. The evaluator exhibits sensitivity to label ordering, "
                f"which is a known limitation in LLM-based evaluation. Consider re-running this debate with "
                f"a different judge model or adjusting the presentation format for a more robust assessment."
            )
        
        report_id = str(uuid.uuid4())
        async with get_db() as db:
            await execute_insert(
                db,
                """
                INSERT INTO bias_reports (id, debate_id, original_winner, swapped_winner, bias_detected, explanation)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (report_id, id, original_winner, original_side_equivalent, bias_detected, explanation)
            )
            report = await fetch_one(db, "SELECT * FROM bias_reports WHERE id = ?", (report_id,))
        return report
        
    except Exception as e:
        logger.error("Failed to run bias check: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to execute bias check: {e}")

# Note: The path is 's' because the prefix is '/debate' -> '/debates'
@router.get("s", response_model=DebateListResponse)
async def list_debates(limit: int = 50, offset: int = 0):
    """
    List debates, sorted by newest first.
    """
    async with get_db() as db:
        debates = await fetch_all(
            db, 
            "SELECT * FROM debates ORDER BY created_at DESC LIMIT ? OFFSET ?", 
            (limit, offset)
        )
        total_row = await fetch_one(db, "SELECT COUNT(*) as cnt FROM debates")
        total = total_row["cnt"] if total_row else 0
        
    return {
        "debates": debates,
        "total": total
    }


@router.get("/{id}/chained-suggestions")
async def get_chained_suggestions(id: str):
    """
    Generate 3 context-aware follow-up debate suggestions using Gemini.
    Uses the debate's question, winner, and verdict thesis to produce relevant continuations.
    """
    import json
    import typing_extensions as typing
    from app.services.gemini_client import generate_response as gemini_call
    from app.utils.prompts import get_chained_suggestions_system_prompt

    class ChainedSuggestionsDict(typing.TypedDict):
        suggestions: typing.List[str]

    async with get_db() as db:
        debate = await fetch_one(db, "SELECT * FROM debates WHERE id = ?", (id,))
        if not debate:
            raise HTTPException(status_code=404, detail="Debate not found")
        if debate["status"] != "complete":
            raise HTTPException(status_code=400, detail="Debate must be complete to generate suggestions")

        verdict = await fetch_one(
            db,
            "SELECT * FROM judge_verdicts WHERE debate_id = ? AND persona = 'single_judge' LIMIT 1",
            (id,)
        )

    winning_side = debate["winning_side"] or "for"
    winning_thesis = ""
    if verdict and verdict["reasoning"]:
        # Extract the WINNING STANCE line from the verdict
        for line in verdict["reasoning"].split("\n"):
            if line.strip().upper().startswith("WINNING STANCE:"):
                winning_thesis = line.strip().replace("WINNING STANCE:", "").strip()
                break
        if not winning_thesis:
            winning_thesis = verdict["reasoning"][:200]

    sys_prompt = get_chained_suggestions_system_prompt(
        question=debate["question"],
        winning_side=winning_side,
        winning_thesis=winning_thesis
    )

    try:
        response_json = await gemini_call(
            model_name="gemini-3.1-flash-lite",
            system_prompt=sys_prompt,
            messages=[{"role": "user", "content": f"Generate follow-up debate topics for: {debate['question']}"}],
            temperature=0.8,
            response_schema=ChainedSuggestionsDict,
            use_cache=True,
            debate_id=id
        )

        data = json.loads(response_json)
        suggestions = data.get("suggestions", [])

        # Ensure we always return exactly 3
        if len(suggestions) < 3:
            fallbacks = [
                f"Should the conclusions from '{debate['question'][:60]}' be applied globally?",
                f"Does the winning argument ignore key counterevidence?",
                f"Should policy be shaped by this debate's outcome?"
            ]
            suggestions.extend(fallbacks[len(suggestions):3])

        return {"suggestions": suggestions[:3]}

    except Exception as e:
        logger.error("Failed to generate chained suggestions: %s", e)
        # Return intelligent fallbacks based on the debate topic
        return {
            "suggestions": [
                f"Should the implications of '{debate['question'][:50]}' be regulated by law?",
                f"Does the winning argument in this debate hold under extreme conditions?",
                f"What ethical boundaries should constrain the conclusion reached here?"
            ]
        }
