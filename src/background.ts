let savedMessage: { text: string } | null = null;

// content script からのメッセージを受け取る
chrome.runtime.onMessage.addListener((message: { text: string }, sender, sendResponse) => {
    savedMessage = message;
    // popup を開く
    chrome.action.openPopup?.();
    return true;
});

// popup からのメッセージを受け取る
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'popup') {
        // popup が接続されたら保存していたメッセージを送信
        if (savedMessage) {
            port.postMessage(savedMessage);
            savedMessage = null;
        }
    }
});