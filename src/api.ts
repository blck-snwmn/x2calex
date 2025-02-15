// OpenAI API のレスポンス型
interface OpenAIResponse {
    dates: string[];
    summary: string;
}

// 投稿データの型
interface PostData {
    text: string;
}

// OpenAI API 通信用のクラス
class OpenAIClient {
    constructor(private apiKey: string) {}

    async analyze(text: string): Promise<OpenAIResponse> {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "system",
                            content: "You are a helpful assistant that extracts dates and creates summaries from text. Always respond with a JSON object containing 'dates' (array of strings) and 'summary' (string). Example: {\"dates\": [\"2024-01-20\"], \"summary\": \"Brief summary here\"}"
                        },
                        {
                            role: "user",
                            content: text
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('OpenAI API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    response: errorData
                });
                throw new Error(`API request failed (${response.status}): ${response.statusText}. ${errorData}`);
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content;
            
            if (!content) {
                throw new Error('Invalid response format from OpenAI API');
            }

            try {
                const parsed = JSON.parse(content);
                if (!Array.isArray(parsed.dates) || typeof parsed.summary !== 'string') {
                    throw new Error('Invalid response structure');
                }
                return parsed;
            } catch (e) {
                console.error('Response parsing error:', e, 'Original content:', content);
                // 応答がJSON形式でない場合、内容を解析してフォーマットを試みる
                return this.formatNonJsonResponse(content);
            }
        } catch (error) {
            console.error('OpenAI API Error:', error);
            throw error;
        }
    }

    private formatNonJsonResponse(content: string): OpenAIResponse {
        // 応答がJSON形式でない場合の処理
        const dateRegex = /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b|\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b/g;
        const dates = content.match(dateRegex) || [];
        
        return {
            dates: [...new Set(dates)], // 重複を除去
            summary: content.length > 200 ? content.slice(0, 200) + '...' : content
        };
    }
}

export type { PostData, OpenAIResponse };
export { OpenAIClient };