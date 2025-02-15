interface PostData {
    text: string;
}

function addButtonToPost(article: Element) {
    if (article.querySelector('.x2calex-button')) return;

    const button = document.createElement('button');
    button.textContent = 'View in Popup';
    button.className = 'x2calex-button';
    button.style.cssText = `
        padding: 4px 8px;
        margin: 4px;
        border-radius: 4px;
        background-color: #1DA1F2;
        color: white;
        border: none;
        cursor: pointer;
    `;

    const postText = article.querySelector('[data-testid="tweetText"]')?.textContent || '';
    
    button.addEventListener('click', () => {
        const data: PostData = { text: postText };
        // background script にメッセージを送信
        chrome.runtime.sendMessage(data).catch(err => {
            console.error('Failed to send message:', err);
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
                    if (node.tagName === 'ARTICLE') {
                        addButtonToPost(node);
                    }
                    node.querySelectorAll('article').forEach(addButtonToPost);
                }
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

observePosts();