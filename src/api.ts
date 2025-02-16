// OpenAI API のレスポンス型
interface OpenAIResponse {
    dates: string[];
    summary: string;
    hasUntilExpression: boolean; // 「まで」の表現があるかどうか
}

// 投稿データの型
interface PostData {
    text: string;
    url: string;
    postedAt?: string; // 投稿日時
}

// 日付と時間の情報を格納する型
interface DateTimeInfo {
    date: Date;
    hasTime: boolean;
}

// OpenAI API 通信用のクラス
class OpenAIClient {
    constructor(private apiKey: string) { }

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
                            content: `Extract dates, times, and "until" expressions from the text. Analyze the following aspects:
1. All dates and times mentioned (in YYYY-MM-DD HH:mm format if time is present, or YYYY-MM-DD if only date)
2. Check if text contains expressions like "まで", "until", "〜まで"
3. Create a brief summary

Respond in JSON format with:
- 'dates': array of date strings
- 'summary': string
- 'hasUntilExpression': boolean

Example response:
{
    "dates": ["2024-01-20 15:30", "2024-01-21"],
    "summary": "Brief summary here",
    "hasUntilExpression": true
}`
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
                if (!Array.isArray(parsed.dates) ||
                    typeof parsed.summary !== 'string' ||
                    typeof parsed.hasUntilExpression !== 'boolean') {
                    throw new Error('Invalid response structure');
                }
                return parsed;
            } catch (e) {
                console.error('Response parsing error:', e, 'Original content:', content);
                return this.formatNonJsonResponse(content);
            }
        } catch (error) {
            console.error('OpenAI API Error:', error);
            throw error;
        }
    }

    private formatNonJsonResponse(content: string): OpenAIResponse {
        // 日付と時間のパターン（より詳細なパターンを追加）
        const dateTimePatterns = [
            // YYYY-MM-DD HH:mm:ss
            /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\s+\d{1,2}:\d{2}:\d{2}\b/g,
            // YYYY-MM-DD HH:mm
            /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\s+\d{1,2}:\d{2}\b/g,
            // YYYY-MM-DD
            /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/g,
            // MM-DD HH:mm（現在の年を使用）
            /\b\d{1,2}[-/]\d{1,2}\s+\d{1,2}:\d{2}\b/g,
            // HH:mm（単独の時間）
            /\b\d{1,2}:\d{2}\b/g
        ];

        let dates: string[] = [];
        const currentYear = new Date().getFullYear();

        for (const pattern of dateTimePatterns) {
            const matches = content.match(pattern) || [];
            dates = [...dates, ...matches.map(match => {
                // 年が含まれていない場合は現在の年を追加
                if (!match.includes('-') && !match.includes('/')) {
                    // 時刻のみの場合は今日の日付を使用
                    const today = new Date();
                    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')} ${match}`;
                }
                if (match.split(/[-/]/)[0].length === 2) {
                    return `${currentYear}-${match}`;
                }
                return match;
            })];
        }

        // 「まで」の表現を検出
        const hasUntilExpression = /まで|until|～|〜/.test(content);

        return {
            dates: [...new Set(dates)], // 重複を除去
            summary: content.length > 200 ? content.slice(0, 200) + '...' : content,
            hasUntilExpression
        };
    }
}

export type { PostData, OpenAIResponse, DateTimeInfo };
export { OpenAIClient };