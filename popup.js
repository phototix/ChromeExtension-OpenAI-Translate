document.addEventListener('DOMContentLoaded', async () => {
  // Load saved settings
  const data = await chrome.storage.sync.get(['apiKey', 'defaultLanguage']);
  
  if (data.apiKey) {
    document.getElementById('api-key').value = data.apiKey;
  }
  
  if (data.defaultLanguage) {
    document.getElementById('default-language').value = data.defaultLanguage;
  }

  // Check if there's a pending translation
  const pending = await chrome.storage.local.get(['pendingTranslation']);
  if (pending.pendingTranslation) {
    showTranslationSection(pending.pendingTranslation);
    await chrome.storage.local.remove(['pendingTranslation']);
  }

  // Save settings
  document.getElementById('save-btn').addEventListener('click', async () => {
    const apiKey = document.getElementById('api-key').value.trim();
    const defaultLanguage = document.getElementById('default-language').value;
    
    const status = document.getElementById('status');
    
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    try {
      await chrome.storage.sync.set({
        apiKey: apiKey,
        defaultLanguage: defaultLanguage
      });
      
      showStatus('Settings saved successfully!', 'success');
    } catch (error) {
      showStatus('Error saving settings: ' + error.message, 'error');
    }
  });
});

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = 'status ' + type;
  status.style.display = 'block';
  
  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}

function showTranslationSection(text) {
  const mainContent = document.querySelector('body');
  mainContent.innerHTML += `
    <div style="margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px;">
      <h4 style="color: black;">Translate Selected Text</h4>
      <div style="margin-bottom: 15px;">
        <strong style="color: black;">Original Text:</strong>
        <p style="margin: 8px 0; padding: 8px; background: #f8f9fa; border-radius: 4px; color: black;">${escapeHtml(text)}</p>
      </div>
      <div style="margin-bottom: 15px;">
        <label for="popup-target-language" style="color: black;">Translate to:</label>
        <select id="popup-target-language" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; color: black;">
          <option value="Simplified Chinese">Simplified Chinese</option>
          <option value="Traditional Chinese">Traditional Chinese</option>
          <option value="English">English</option>
          <option value="Malay">Malay</option>
        </select>
      </div>
      <button id="popup-translate-btn" style="width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Translate
      </button>
      <div id="popup-result" style="margin-top: 15px; display: none;">
        <strong style="color: black;">Translation:</strong>
        <p id="popup-translation-result" style="margin: 8px 0; padding: 8px; background: #e8f5e8; border-radius: 4px; color: black;"></p>
      </div>
      <div id="popup-error" style="margin-top: 15px; display: none; color: #dc3545;"></div>
    </div>
  `;

  document.getElementById('popup-translate-btn').addEventListener('click', async () => {
    const targetLang = document.getElementById('popup-target-language').value;
    const translateBtn = document.getElementById('popup-translate-btn');
    const resultDiv = document.getElementById('popup-result');
    const errorDiv = document.getElementById('popup-error');
    
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
        document.getElementById('popup-translation-result').textContent = response.translation;
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
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}