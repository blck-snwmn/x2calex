interface PostData {
	text: string;
	url: string;
	postedAt: string;
}

function addButtonToPost(article: Element) {
	if (article.querySelector(".x2calex-button")) return;

	const button = document.createElement("button");
	button.textContent = "View in Popup";
	button.className = "x2calex-button";
	button.style.cssText = `
        padding: 4px 8px;
        margin: 4px;
        border-radius: 4px;
        background-color: #1DA1F2;
        color: white;
        border: none;
        cursor: pointer;
    `;

	const postText =
		article.querySelector('[data-testid="tweetText"]')?.textContent || "";

	// time要素からISOString形式の日時を取得
	const timeElement = article.querySelector("time");
	let postedAt = "";

	if (timeElement) {
		// datetime属性から日時を取得（ISO 8601形式）
		const datetime = timeElement.getAttribute("datetime");
		if (datetime) {
			try {
				// 日時文字列の妥当性チェック
				const date = new Date(datetime);
				if (!isNaN(date.getTime())) {
					postedAt = date.toISOString();
				} else {
					console.warn("Invalid datetime attribute:", datetime);
				}
			} catch (e) {
				console.error("Error parsing datetime:", e);
			}
		}
	}

	// 日時が取得できなかった場合は現在時刻をフォールバックとして使用
	if (!postedAt) {
		postedAt = new Date().toISOString();
		console.warn("Using current time as fallback for post timestamp");
	}

	// URLの取得（time要素の親のa要素のhref属性から）
	const postUrl =
		window.location.origin +
		(timeElement?.closest("a")?.getAttribute("href") || "");

	button.addEventListener("click", () => {
		const data: PostData = {
			text: postText,
			url: postUrl,
			postedAt,
		};
		// background script にメッセージを送信
		chrome.runtime.sendMessage(data).catch((err) => {
			console.error("Failed to send message:", err);
		});
	});

	const actions = article.querySelector('[role="group"]');
	if (actions) {
		actions.appendChild(button);
	}
}

function observePosts() {
	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			for (const node of mutation.addedNodes) {
				if (node instanceof Element) {
					if (node.tagName === "ARTICLE") {
						addButtonToPost(node);
					}
					node.querySelectorAll("article").forEach(addButtonToPost);
				}
			}
		}
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});
}

observePosts();
