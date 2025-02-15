interface OpenAIResponse {
    dates: string[];
    summary: string;
}

interface PopupMessage {
    originalText: string;
    analysis: OpenAIResponse;
}

// background script に接続
const port = chrome.runtime.connect({ name: 'popup' });

// background script からのメッセージを受け取る
port.onMessage.addListener((message: PopupMessage) => {
    const content = document.getElementById('content');
    if (!content) return;

    content.innerHTML = ''; // Clear previous content

    // 元の投稿を表示
    const originalPost = document.createElement('div');
    originalPost.className = 'post original';
    originalPost.innerHTML = `<h3>Original Post</h3><p>${message.originalText}</p>`;
    content.appendChild(originalPost);

    // 分析結果を表示
    const analysis = document.createElement('div');
    analysis.className = 'post analysis';
    analysis.innerHTML = `
        <h3>Analysis</h3>
        <div class="dates">
            <h4>Dates Found:</h4>
            ${message.analysis.dates.length > 0 
                ? `<ul>${message.analysis.dates.map(date => `<li>${date}</li>`).join('')}</ul>`
                : '<p>No dates found</p>'
            }
        </div>
        <div class="summary">
            <h4>Summary:</h4>
            <p>${message.analysis.summary}</p>
        </div>
    `;
    content.appendChild(analysis);
});