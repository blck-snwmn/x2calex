import { OpenAIClient, type OpenAIResponse, type PostData } from "./api";

let savedMessage: PostData | null = null;

// エラーメッセージをフォーマットする関数
function formatError(error: any): string {
	if (error instanceof Error) {
		return `${error.name}: ${error.message}`;
	}
	return String(error);
}

// content script からのメッセージを受け取る
chrome.runtime.onMessage.addListener(
	async (message: PostData, sender, sendResponse) => {
		savedMessage = message;
		chrome.action.openPopup?.();
		return true;
	},
);

// popup からのメッセージを受け取る
chrome.runtime.onConnect.addListener((port) => {
	if (port.name === "popup") {
		// 初期表示時に保存した情報を送信
		if (savedMessage) {
			port.postMessage({
				type: "initial",
				text: savedMessage.text,
				url: savedMessage.url,
				postedAt: savedMessage.postedAt,
			});
		}

		// ポップアップからの分析リクエストを処理
		port.onMessage.addListener(async (message) => {
			if (message.type === "analyze" && savedMessage) {
				try {
					const { openaiApiKey } = await chrome.storage.sync.get([
						"openaiApiKey",
					]);
					if (!openaiApiKey) {
						throw new Error(
							"OpenAI API key is not set. Please configure it in the extension options.",
						);
					}

					const client = new OpenAIClient(openaiApiKey);
					const analyzedData = await client.analyze(savedMessage.text);
					port.postMessage({
						type: "analysis",
						result: analyzedData,
						postedAt: savedMessage.postedAt,
					});
				} catch (error) {
					console.error("Error processing message:", error);
					const errorMessage = formatError(error);
					port.postMessage({
						type: "error",
						error: `Error: ${errorMessage}. Please check the console for more details.`,
					});
				}
			}
		});

		// ポップアップが閉じられたときにメッセージをクリア
		port.onDisconnect.addListener(() => {
			savedMessage = null;
		});
	}
});
