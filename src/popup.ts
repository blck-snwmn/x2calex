import { OpenAIResponse } from './api';
import { CalendarLinkGenerator } from './calendar';

interface PopupMessage {
    type: 'initial' | 'analysis' | 'error';
    text?: string;
    url?: string;
    postedAt?: string;
    result?: OpenAIResponse;
    error?: string;
}

// background script に接続
const port = chrome.runtime.connect({ name: 'popup' });
const analyzeButton = document.getElementById('analyze') as HTMLButtonElement;
const content = document.getElementById('content');

if (!content || !analyzeButton) {
    throw new Error('Required elements not found');
}

let currentText = '';
let currentUrl = '';
let currentPostedAt = '';

// 分析結果を表示する関数
function displayAnalysis(analysis: OpenAIResponse) {
    console.log('Analysis result:', {
        dates: analysis.dates,
        hasUntilExpression: analysis.hasUntilExpression,
        postedAt: currentPostedAt
    });

    const analysisDiv = document.createElement('div');
    analysisDiv.className = 'post analysis';

    // カレンダーリンクを生成
    const calendarLink = CalendarLinkGenerator.generateLink(
        analysis.summary.split('\n')[0], // 1行目をタイトルとして使用
        analysis.summary,
        currentUrl,
        analysis.dates,
        analysis.hasUntilExpression,
        currentPostedAt
    );

    console.log('Generated calendar link:', calendarLink);

    analysisDiv.innerHTML = `
        <h3>Analysis</h3>
        <div class="dates">
            <h4>Dates Found:</h4>
            ${analysis.dates.length > 0
            ? `<ul>${analysis.dates.map(date => `<li>${date}</li>`).join('')}</ul>`
            : '<p>No dates found</p>'
        }
            ${analysis.hasUntilExpression ? '<p><i>Contains "until" expression - using post time as start time</i></p>' : ''}
        </div>
        <div class="summary">
            <h4>Summary:</h4>
            <p>${analysis.summary}</p>
        </div>
        <div class="calendar-link">
            <a href="${calendarLink}" target="_blank" class="calendar-button">
                Add to Google Calendar
            </a>
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
port.onMessage.addListener((message: PopupMessage) => {
    switch (message.type) {
        case 'initial':
            if (message.text && message.url && message.postedAt) {
                console.log('Received initial data:', {
                    url: message.url,
                    postedAt: message.postedAt
                });
                currentText = message.text;
                currentUrl = message.url;
                currentPostedAt = message.postedAt;
                displayOriginalPost(message.text);
                analyzeButton.disabled = false;
            }
            break;
        case 'analysis':
            if (message.result) {
                displayAnalysis(message.result);
            }
            analyzeButton.disabled = false;
            break;
        case 'error':
            if (message.error) {
                displayError(message.error);
            }
            analyzeButton.disabled = false;
            break;
    }
});

// 分析ボタンのクリックハンドラー
analyzeButton.addEventListener('click', () => {
    analyzeButton.disabled = true;
    port.postMessage({ type: 'analyze' });
});