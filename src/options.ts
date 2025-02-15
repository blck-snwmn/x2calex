const saveButton = document.getElementById('save') as HTMLButtonElement;
const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
const messageDiv = document.getElementById('message') as HTMLDivElement;

// 保存されているAPIキーを読み込む
chrome.storage.sync.get(['openaiApiKey'], (result) => {
    if (result.openaiApiKey) {
        apiKeyInput.value = result.openaiApiKey;
    }
});

saveButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        showMessage('Please enter an API key', 'error');
        return;
    }

    try {
        await chrome.storage.sync.set({ openaiApiKey: apiKey });
        showMessage('API key saved successfully', 'success');
    } catch (error) {
        showMessage('Failed to save API key', 'error');
    }
});

function showMessage(text: string, type: 'success' | 'error') {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
}