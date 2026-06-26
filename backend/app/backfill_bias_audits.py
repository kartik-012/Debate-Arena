import asyncio
from app.database import get_db, fetch_all, execute_query
from app.routers.debate import run_bias_check

async def backfill():
    async with get_db() as db:
        # Only re-audit debates whose judge was NOT Gemini 3.1 Flash Lite —
        # those are the ones whose existing bias_reports used the wrong re-check model.
        rows = await fetch_all(
            db,
            """
            SELECT d.id, d.model_judge FROM debates d
            JOIN bias_reports br ON br.debate_id = d.id
            WHERE d.status = 'complete' AND d.model_judge != 'Gemini 3.1 Flash Lite'
            """
        )

    print(f"Found {len(rows)} debates with mismatched judge models to re-audit.\n")

    success = 0
    failed = 0

    for r in rows:
        debate_id = r["id"]
        judge = r["model_judge"]
        try:
            # Delete the old (wrong-model) report first so run_bias_check
            # doesn't just return the cached existing one.
            async with get_db() as db:
                await execute_query(db, "DELETE FROM bias_reports WHERE debate_id = ?", (debate_id,))

            result = await run_bias_check(debate_id)
            print(f"✅ Re-audited {debate_id} (judge={judge}) -> bias_detected={result['bias_detected']}")
            success += 1
        except Exception as e:
            print(f"❌ Failed {debate_id} (judge={judge}): {e}")
            failed += 1

    print(f"\nDone. Re-audited={success}, Failed={failed}")

if __name__ == "__main__":
    asyncio.run(backfill())