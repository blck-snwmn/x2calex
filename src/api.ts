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
                            content: `テキストから日付、時間、「まで」などの表現を抽出し、内容を要約してください。
以下の点を分析してください：
1. 言及されているすべての日付と時間（時間がある場合はYYYY-MM-DD HH:mm形式、日付のみの場合はYYYY-MM-DD形式）
2. 「まで」「until」「〜まで」などの表現の有無
3. 内容の簡潔な要約（日本語で）

以下のJSON形式で応答してください：
- 'dates': 日付文字列の配列
- 'summary': 要約文（日本語）
- 'hasUntilExpression': 「まで」の表現の有無（真偽値）

応答例：
{
    "dates": ["2024-01-20 15:30", "2024-01-21"],
    "summary": "簡潔な要約をここに記述",
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