chrome.runtime.onInstalled.addListener(() => {
  // Create context menu
  chrome.contextMenus.create({
    id: "translate-text",
    title: "Translate",
    contexts: ["selection"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "translate-text" && info.selectionText) {
    // Inject content script if not already injected
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      
      // Send message after script is injected
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, {
          action: "translateText",
          text: info.selectionText
        }).catch(error => {
          console.error('Error sending message:', error);
          // Fallback: open translation in popup
          showTranslationInPopup(info.selectionText);
        });
      }, 100);
    } catch (error) {
      console.error('Error injecting script:', error);
      showTranslationInPopup(info.selectionText);
    }
  }
});

// Handle API requests from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate") {
    translateText(request.text, request.targetLang)
      .then(translation => sendResponse({ success: true, translation }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }
});

// Get the current active tab URL
async function getCurrentPageUrl() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab.url;
  } catch (error) {
    console.error('Error getting current page URL:', error);
    return null;
  }
}

async function translateText(text, targetLang, pageUrl = null) {
  const storageData = await chrome.storage.sync.get(['apiKey']);
  
  if (!storageData.apiKey) {
    throw new Error('OpenAI API key not set. Please configure in extension settings.');
  }

  const languageMap = {
    'Simplified Chinese': '简体中文',
    'Traditional Chinese': '繁體中文',
    'English': 'English',
    'Malay': 'Bahasa Melayu'
  };

  const targetLanguage = languageMap[targetLang] || targetLang;

  const context = pageUrl ? ` Context: This text is from webpage ${pageUrl}.` : '';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${storageData.apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a professional translator. Translate the following text to ${targetLanguage}.${context} Only return the translation, no additional text.`
        },
        {
          role: "user",
          content: text
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Translation failed');
  }

  const responseData = await response.json();
  return responseData.choices[0].message.content.trim();
}

// Fallback function to show translation in browser action popup
function showTranslationInPopup(text) {
  // Store the text temporarily and open the popup
  chrome.storage.local.set({ pendingTranslation: text }, () => {
    chrome.action.openPopup();
  });
}