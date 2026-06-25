import os
import asyncio
import google.generativeai as genai

# Load key directly
API_KEY = "AQ.Ab8RN6JUYlM4oWqT9WKn5WWsejig-cCVwqBk9pPtZiumhC_ICw"
genai.configure(api_key=API_KEY)

async def test():
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        print("Sending request...")
        response = await model.generate_content_async("Say hello")
        print("Success:", response.text)
    except Exception as e:
        print("Error:", str(e))

asyncio.run(test())
