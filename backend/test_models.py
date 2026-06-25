import asyncio
import google.generativeai as genai

API_KEY = "AQ.Ab8RN6JUYlM4oWqT9WKn5WWsejig-cCVwqBk9pPtZiumhC_ICw"
genai.configure(api_key=API_KEY)

def list_models():
    for m in genai.list_models():
        print(m.name)

list_models()
