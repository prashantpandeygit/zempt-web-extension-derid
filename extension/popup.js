const messagesDiv = document.getElementById("messages");
const inputForm = document.getElementById("input-form");
const input = document.getElementById("input");
const closeButton = document.getElementById("close-button");

const urlParams = new URLSearchParams(window.location.search);

const OPENROUTER_API_KEY = window.OPENROUTER_API_KEY || "";

let conversationHistory = [
    {
        role: "system",
        content: "You are zempt, a friendly AI assistant. Keep responses concise (1-2 short sentences), maintain conversation context, use simple casual language."
    },
    { role: "user", content: urlParams.get("query") }
];

function addMessage(content, role) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", role);
    messageDiv.textContent = content;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function showLoadingIndicator() {
    const loadingDiv = document.createElement("div");
    loadingDiv.id = "loading-indicator";
    loadingDiv.classList.add("message", "assistant", "typing-indicator");
    loadingDiv.innerHTML = `
        <span class="typing-dot" style="animation-delay: 0s;"></span>
        <span class="typing-dot" style="animation-delay: 0.2s;"></span>
        <span class="typing-dot" style="animation-delay: 0.4s;"></span>
    `;
    messagesDiv.appendChild(loadingDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function hideLoadingIndicator() {
    const loadingDiv = document.getElementById("loading-indicator");
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

async function getExplanation(history) {
    try {
        const messages = history.slice(-6).map(msg => ({
            role: msg.role === "system" ? "system" : msg.role,
            content: msg.content
        }));

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": chrome.runtime.getURL(""),
                "X-Title": "zempt Web Extension"
            },
            body: JSON.stringify({
                model: "anthropic/claude-3.5-haiku",
                messages: messages,
                max_tokens: 150,
                temperature: 0.7
            }),
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 401) {
                return "API key configuration error.";
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const explanation = data.choices?.[0]?.message?.content || "I'm feeling a bit prickly today. Try again?";
        return explanation.replace(/\*\*/g, "").trim();
        
    } catch (error) {
        console.error("Error:", error);
        return "zempt is having a prickly moment. Try again!";
    }
}

async function handleConversation() {
    try {
        showLoadingIndicator();
        const explanation = await getExplanation(conversationHistory);
        hideLoadingIndicator();
        
        conversationHistory.push({ 
            role: "assistant", 
            content: explanation.replace("AI", "AI") 
        });
        
        addMessage(explanation, "assistant");
        
    } catch (error) {
        hideLoadingIndicator();
        addMessage("Sorry, I'm having trouble connecting!");
    }
}

inputForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const query = input.value.trim();
    
    if (query) {
        conversationHistory.push({ role: "user", content: query });
        addMessage(query, "user");
        input.value = "";
        
        await handleConversation();
    }
});

closeButton.addEventListener("click", () => {
    window.parent.postMessage("close", "*");
});

if (conversationHistory[1].content) {
    handleConversation();
}