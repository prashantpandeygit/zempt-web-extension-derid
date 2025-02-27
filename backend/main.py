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

@app.get("/")
async def health_check():
    return {
        "status": "running",
        "service": "zemptAI",
        "version": "1.0",
        "endpoints": {
            "explain": "/explain (POST)"
        }
    }

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "chrome-extension://agfnjnckbeemdejeojjhdmifihdafoep", "https://zemptai-web-extension.onrender.com/", "https://zemptai-web-extension.onrender.com/explain"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise RuntimeError("GOOGLE_API_KEY not found in .env file")

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-pro')

class ChatRequest(BaseModel):
    conversation: list
    max_tokens: int = 200
    system_prompt: str = None

def format_prompt(history):
    system_prompt = """You are zemptAI, a friendly AI assistant. Follow these rules:
1. Keep responses concise (1-2 short sentences)
2. Maintain conversation context
3. Use simple, casual language

Current conversation:"""
    
    formatted = [system_prompt]
    for msg in history[-10:]:  
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
        
        try:
            response.resolve()
            if not response.text:
                return {"explanation": "I'm feeling a bit prickly today. Try again?"}
            
            cleaned_text = response.text.replace("**", "")
            return {"explanation": cleaned_text}
            
        except Exception as e:
            return {"explanation": f"zemptAI stumbled: {str(e)}"}
        
    except Exception as e:
        print(f"Server Error: {str(e)}")
        return {"explanation": "Whoops! Try again soon!"}

URL = "https://zemptai-web-extension.onrender.com/"  

def keep_alive():
    while True:
        try:
            response = requests.get(URL)
            print(f"Keep-alive ping sent. Status Code: {response.status_code}")
        except requests.RequestException as e:
            print(f"Failed to ping {URL}: {e}")
        time.sleep(600)  

@app.on_event("startup")
async def start_keep_alive():
    threading.Thread(target=keep_alive, daemon=True).start()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
