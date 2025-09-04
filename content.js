// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translateText") {
    showTranslationPopup(request.text);
    sendResponse({ received: true });
  }
  return true;
});

function showTranslationPopup(text) {
  const existingPopup = document.getElementById('translation-popup');
  if (existingPopup) {
    existingPopup.remove();
  }

  // Create popup element
  const popup = document.createElement('div');
  popup.id = 'translation-popup';
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 2px solid #007bff;
    border-radius: 8px;
    padding: 20px;
    z-index: 10000;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    min-width: 600px;
    max-width: 800px;
    color: black; /* Ensure text color */
  `;

  popup.innerHTML = `
    <div style="margin-bottom: 15px;display:none;">
      <strong>Original Text:</strong>
      <p style="margin: 8px 0; padding: 8px; background: #f8f9fa; border-radius: 4px; color: black;max-height:300px;overflow-y:scroll;">${escapeHtml(text)}</p>
    </div>
    <div style="margin-bottom: 15px;">
      <label for="target-language" style="display: block; margin-bottom: 5px; font-weight: bold; color: black;">Translate to:</label>
      <select id="target-language" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; color: black;">
        <option value="Simplified Chinese">Simplified Chinese</option>
        <option value="Traditional Chinese">Traditional Chinese</option>
        <option value="English">English</option>
        <option value="Malay">Malay</option>
      </select>
    </div>
    <button id="translate-btn" style="width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
      Translate
    </button>
    <div id="result" style="margin-top: 15px; display: none;">
      <strong style="color: black;">Translation:</strong>
      <p id="translation-result" style="margin: 8px 0; padding: 8px; background: #e8f5e8; border-radius: 4px; color: black;max-height:300px;overflow-y:scroll;"></p>
    </div>
    <div id="error" style="margin-top: 15px; display: none; color: #dc3545;"></div>
    <button id="close-btn" style="position: absolute; top: 5px; right: 5px; background: none; border: none; font-size: 18px; cursor: pointer; color: black;">×</button>
  `;

  document.body.appendChild(popup);

  // Add event listeners
  const translateBtn = popup.querySelector('#translate-btn');
  translateBtn.addEventListener('click', async () => {
    const targetLang = popup.querySelector('#target-language').value;
    const resultDiv = popup.querySelector('#result');
    const errorDiv = popup.querySelector('#error');
    
    translateBtn.disabled = true;
    translateBtn.textContent = 'Translating...';
    resultDiv.style.display = 'none';
    errorDiv.style.display = 'none';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'translate',
        text: text,
        targetLang: targetLang
      });

      if (response.success) {
        popup.querySelector('#translation-result').textContent = response.translation;
        resultDiv.style.display = 'block';
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      errorDiv.textContent = error.message;
      errorDiv.style.display = 'block';
    } finally {
      translateBtn.disabled = false;
      translateBtn.textContent = 'Translate';
    }
  });

  popup.querySelector('#close-btn').addEventListener('click', () => {
    popup.remove();
  });

  // Close popup when clicking outside
  const closePopupHandler = (e) => {
    if (!popup.contains(e.target)) {
      popup.remove();
      document.removeEventListener('click', closePopupHandler);
    }
  };
  
  setTimeout(() => {
    document.addEventListener('click', closePopupHandler);
  }, 100);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize message listener
console.log('Translation content script loaded');