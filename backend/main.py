from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import os
import requests
import threading
import time
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",
        "chrome-extension://agfnjnckbeemdejeojjhdmifihdafoep",
        "https://zempt-web-extension-derid.onrender.com" 
    ],
    allow_credentials=True,
    allow_methods=["POST", "GET"],  
    allow_headers=["*"],
)

api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise RuntimeError("GOOGLE_API_KEY not found in .env file")

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-1.5-flash')  

class ChatRequest(BaseModel):
    conversation: list
    max_tokens: int = 200

def format_prompt(history):
    system_prompt = """You are zempt. Follow these rules:
1. Keep responses concise (1-2 short sentences)
2. Maintain conversation context
3. Use simple, casual language"""
    
    formatted = [system_prompt]
    for msg in history[-6:]:  
        if msg['role'] == 'system':
            continue
        prefix = "User" if msg['role'] == 'user' else "zemptAI"
        formatted.append(f"{prefix}: {msg['content']}")
    
    return "\n".join(formatted)

@app.post("/explain")
async def explain(request: ChatRequest):
    try:
        prompt = format_prompt(request.conversation)
        
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=request.max_tokens,
                temperature=0.7
            )
        )
        
        if not response.parts:
            return {"explanation": "I'm feeling a bit prickly today. Try again?"}
            
        cleaned_text = response.text.replace("**", "").strip()
        return {"explanation": cleaned_text}
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {"explanation": "Whoops! Try again soon!"}

KEEP_ALIVE_URL = "https://zempt-web-extension-derid.onrender.com"  

def keep_alive():
    while True:
        try:
            response = requests.get(f"{KEEP_ALIVE_URL}/")
            print(f"Keep-alive status: {response.status_code}")
        except Exception as e:
            print(f"Keep-alive failed: {str(e)}")
        time.sleep(300)

@app.on_event("startup")
async def start_keep_alive():
    threading.Thread(target=keep_alive, daemon=True).start()

@app.get("/")
async def health_check():
    return {
        "status": "running",
        "version": "1.1",
        "endpoints": {
            "/explain": {"methods": ["POST"]}
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
