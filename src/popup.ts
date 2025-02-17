import type { OpenAIResponse } from "./api";
import { CalendarLinkGenerator } from "./calendar";

interface PopupMessage {
	type: "initial" | "analysis" | "error";
	text?: string;
	url?: string;
	postedAt?: string;
	result?: OpenAIResponse;
	error?: string;
}

// background script に接続
const port = chrome.runtime.connect({ name: "popup" });
const analyzeButton = document.getElementById("analyze") as HTMLButtonElement;
const content = document.getElementById("content");

if (!content || !analyzeButton) {
	throw new Error("Required elements not found");
}

let currentText = "";
let currentUrl = "";
let currentPostedAt = "";

// 分析結果を表示する関数
function displayAnalysis(analysis: OpenAIResponse) {
	if (!content) return;

	console.log("Analysis result:", {
		dates: analysis.dates,
		hasUntilExpression: analysis.hasUntilExpression,
		postedAt: currentPostedAt,
	});

	const analysisDiv = document.createElement("div");
	analysisDiv.className = "post analysis";

	// カレンダーリンクを生成
	const calendarLink = CalendarLinkGenerator.generateUrl(
		analysis.summary.split("\n")[0], // 1行目をタイトルとして使用
		analysis.summary,
		analysis.dates,
		currentPostedAt,
		analysis.hasUntilExpression,
	);

	console.log("Generated calendar link:", calendarLink);

	analysisDiv.innerHTML = `
        <div class="section-label">Dates Found</div>
        ${analysis.dates.length > 0
			? `<ul class="date-list">${analysis.dates.map((date) => `<li class="date-item">${date}</li>`).join("")}</ul>`
			: `<div class="no-dates">No dates found</div>`
		}
        ${analysis.hasUntilExpression ? '<div class="note">Using post time as start time (contains "until")</div>' : ""}
        <div class="section-label" style="margin-top: 6px;">Summary</div>
        <p class="summary-text">${analysis.summary}</p>
        <a href="${calendarLink}" target="_blank" class="calendar-button">Add to Google Calendar</a>
    `;

	// 既存の分析結果を削除して新しい結果を追加
	const existingAnalysis = content.querySelector(".analysis");
	if (existingAnalysis) {
		existingAnalysis.remove();
	}
	content.appendChild(analysisDiv);
}

// エラーメッセージを表示する関数
function displayError(message: string) {
	if (!content) return;

	const errorDiv = document.createElement("div");
	errorDiv.className = "post error";
	errorDiv.innerHTML = `
        <div class="section-label">Error</div>
        <p class="summary-text">${message}</p>
    `;

	const existingAnalysis = content.querySelector(".analysis");
	if (existingAnalysis) {
		existingAnalysis.remove();
	}
	content.appendChild(errorDiv);
}

// 元の投稿を表示する関数
function displayOriginalPost(text: string) {
	if (!content) return;

	content.innerHTML = "";
	const originalPost = document.createElement("div");
	originalPost.className = "post original";
	originalPost.innerHTML = `
        <div class="section-label">Original Post</div>
        <p class="summary-text">${text}</p>
    `;
	content.appendChild(originalPost);
}

// background script からのメッセージを処理
port.onMessage.addListener((message: PopupMessage) => {
	switch (message.type) {
		case "initial":
			if (message.text && message.url && message.postedAt) {
				console.log("Received initial data:", {
					url: message.url,
					postedAt: message.postedAt,
				});
				currentText = message.text;
				currentUrl = message.url;
				currentPostedAt = message.postedAt;
				displayOriginalPost(message.text);
				analyzeButton.disabled = false;
			}
			break;
		case "analysis":
			if (message.result) {
				displayAnalysis(message.result);
			}
			analyzeButton.disabled = false;
			break;
		case "error":
			if (message.error) {
				displayError(message.error);
			}
			analyzeButton.disabled = false;
			break;
	}
});

// 分析ボタンのクリックハンドラー
analyzeButton.addEventListener("click", () => {
	analyzeButton.disabled = true;
	port.postMessage({ type: "analyze" });
});
