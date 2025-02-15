import { OpenAIClient, type OpenAIResponse, type PostData } from './api';

let savedMessage: PostData | null = null;
let analyzedData: OpenAIResponse | null = null;

// エラーメッセージをフォーマットする関数
function formatError(error: any): string {
    if (error instanceof Error) {
        return `${error.name}: ${error.message}`;
    }
    return String(error);
}

// content script からのメッセージを受け取る
chrome.runtime.onMessage.addListener(async (message: PostData, sender, sendResponse) => {
    try {
        const { openaiApiKey } = await chrome.storage.sync.get(['openaiApiKey']);
        if (!openaiApiKey) {
            throw new Error('OpenAI API key is not set. Please configure it in the extension options.');
        }

        const client = new OpenAIClient(openaiApiKey);
        analyzedData = await client.analyze(message.text);
        savedMessage = message;
        chrome.action.openPopup?.();
    } catch (error) {
        console.error('Error processing message:', error);
        const errorMessage = formatError(error);
        analyzedData = {
            dates: [],
            summary: `Error: ${errorMessage}. Please check the console for more details.`
        };
    }
    return true;
});

// popup からのメッセージを受け取る
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'popup') {
        // popup が接続されたら保存していたメッセージとその分析結果を送信
        if (savedMessage && analyzedData) {
            port.postMessage({
                originalText: savedMessage.text,
                analysis: analyzedData
            });
            savedMessage = null;
            analyzedData = null;
        }
    }
});