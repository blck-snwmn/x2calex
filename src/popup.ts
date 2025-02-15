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
const analyzeButton = document.getElementById('analyze') as HTMLButtonElement;
const content = document.getElementById('content');

if (!content || !analyzeButton) {
    throw new Error('Required elements not found');
}

let currentText = '';

// 分析結果を表示する関数
function displayAnalysis(analysis: OpenAIResponse) {
    const analysisDiv = document.createElement('div');
    analysisDiv.className = 'post analysis';
    analysisDiv.innerHTML = `
        <h3>Analysis</h3>
        <div class="dates">
            <h4>Dates Found:</h4>
            ${analysis.dates.length > 0 
                ? `<ul>${analysis.dates.map(date => `<li>${date}</li>`).join('')}</ul>`
                : '<p>No dates found</p>'
            }
        </div>
        <div class="summary">
            <h4>Summary:</h4>
            <p>${analysis.summary}</p>
        </div>
    `;
    
    // 既存の分析結果を削除して新しい結果を追加
    const existingAnalysis = content.querySelector('.analysis');
    if (existingAnalysis) {
        existingAnalysis.remove();
    }
    content.appendChild(analysisDiv);
}

// エラーメッセージを表示する関数
function displayError(message: string) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'post error';
    errorDiv.innerHTML = `
        <h3>Error</h3>
        <p>${message}</p>
    `;
    
    const existingAnalysis = content.querySelector('.analysis');
    if (existingAnalysis) {
        existingAnalysis.remove();
    }
    content.appendChild(errorDiv);
}

// 元の投稿を表示する関数
function displayOriginalPost(text: string) {
    content.innerHTML = ''; // Clear previous content
    const originalPost = document.createElement('div');
    originalPost.className = 'post original';
    originalPost.innerHTML = `<h3>Original Post</h3><p>${text}</p>`;
    content.appendChild(originalPost);
}

// background script からのメッセージを処理
port.onMessage.addListener((message: any) => {
    switch (message.type) {
        case 'initial':
            currentText = message.text;
            displayOriginalPost(message.text);
            analyzeButton.disabled = false;
            break;
        case 'analysis':
            displayAnalysis(message.result);
            analyzeButton.disabled = false;
            break;
        case 'error':
            displayError(message.error);
            analyzeButton.disabled = false;
            break;
    }
});

// 分析ボタンのクリックハンドラー
analyzeButton.addEventListener('click', () => {
    analyzeButton.disabled = true;
    port.postMessage({ type: 'analyze' });
});