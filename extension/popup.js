const messagesDiv = document.getElementById("messages");
const inputForm = document.getElementById("input-form");
const input = document.getElementById("input");
const closeButton = document.getElementById("close-button");

const urlParams = new URLSearchParams(window.location.search);

let conversationHistory = [
    {
        role: "system",
        content: "You are zempt, a friendly AI assistant. Keep responses under 3 sentences, maintain conversation context."
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

async function getExplanation(history) {
    try {
        const trimmedHistory = history.slice(-6);
        
        const response = await fetch("https://zempt-web-extension-derid.onrender.com/explain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                conversation: trimmedHistory, 
                max_tokens: 150
            }),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.explanation;
        
    } catch (error) {
        console.error("Error:", error);
        return "zempt is having a prickly moment. Try again!";
    }
}

async function handleConversation() {
    try {
        const explanation = await getExplanation(conversationHistory);
        
        conversationHistory.push({ 
            role: "assistant", 
            content: explanation.replace("AI", "AI") 
        });
        
        addMessage(explanation, "assistant");
        
    } catch (error) {
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