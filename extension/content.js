let aiExplainerRoot = null;

function showAIExplainer(query, imageUrl) {
  if (!aiExplainerRoot) {
    aiExplainerRoot = document.createElement("div");
    aiExplainerRoot.id = "ai-explainer-root";
    document.body.appendChild(aiExplainerRoot);
  }

  aiExplainerRoot.innerHTML = `
    <div id="ai-explainer" style="position: fixed; bottom: 20px; right: 20px; width: 300px; height: 400px; background: white; border: 1px solid #ccc; border-radius: 5px; z-index: 9999; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
      <div class="drag-handle" style="position: absolute; top: 0; left: 0; right: 40px; height: 30px; cursor: move; z-index: 10000; background: transparent;"></div>
      <iframe src="${chrome.runtime.getURL("popup.html")}?query=${encodeURIComponent(query)}&imageUrl=${encodeURIComponent(imageUrl || "")}" style="width: 100%; height: 100%; border: none;"></iframe>
    </div>
  `;

  const aiExplainer = document.getElementById('ai-explainer');
  const dragHandle = aiExplainer.querySelector('.drag-handle');
  let isDragging = false;
  let startX, startY, startLeft, startTop;

  dragHandle.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = aiExplainer.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    aiExplainer.style.bottom = 'auto';
    aiExplainer.style.right = 'auto';
    aiExplainer.style.left = `${startLeft}px`;
    aiExplainer.style.top = `${startTop}px`;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    aiExplainer.style.left = `${startLeft + deltaX}px`;
    aiExplainer.style.top = `${startTop + deltaY}px`;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "showExplainer") {
    showAIExplainer(msg.query);
  }
});

window.addEventListener("message", (event) => {
  if (event.data === "close" && aiExplainerRoot) {
    aiExplainerRoot.remove();
    aiExplainerRoot = null;
  }
});