import asyncio
import os
import sys

# Ensure backend can be imported
sys.path.insert(0, os.path.abspath("."))

from app.database import init_db
from app.routers.debate import get_analytics

async def test_analytics():
    await init_db()
    try:
        data = await get_analytics()
        print("Analytics Data:", data)
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test_analytics())
