chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "explainWithAI",
    title: "Explain with AI",
    contexts: ["selection"],
    documentUrlPatterns: ["<all_urls>"],
  });
});


chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "explainWithAI" && info.selectionText) {
    const query = `Explain: "${info.selectionText}"`;
    chrome.tabs.sendMessage(tab.id, { action: "showExplainer", query });
  }
});