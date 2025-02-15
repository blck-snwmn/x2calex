// background script に接続
const port = chrome.runtime.connect({ name: 'popup' });

// background script からのメッセージを受け取る
port.onMessage.addListener((message: { text: string }) => {
    const content = document.getElementById('content');
    if (content) {
        const postElement = document.createElement('div');
        postElement.className = 'post';
        postElement.textContent = message.text;
        content.innerHTML = ''; // Clear previous content
        content.appendChild(postElement);
    }
});