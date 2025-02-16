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
1. すべての日付と時間情報を抽出
   - 時間が含まれる場合: YYYY-MM-DD HH:mm形式で出力
   - 日付のみの場合: YYYY-MM-DD形式で出力
   - "午前", "午後", "PM", "AM", "時", "分" などの時間表現も適切に24時間形式に変換
   - "明日", "明後日", "来週" などの相対的な日付表現も具体的な日付に変換

2. 期間を表す表現をチェック
   - 「まで」「〜まで」「until」
   - 「から」「より」「〜から」
   - 「期間」「の間」などの表現

3. 内容の簡潔な要約（日本語で）
   - イベントや予定の主な内容
   - 場所の情報（もしあれば）
   - 重要な条件や注意事項

以下のJSON形式で応答してください：
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
            /\b\d{1,2}:\d{2}\b/g,
            // 時刻表現（午前/午後）
            /午[前後]\s*\d{1,2}\s*時(\s*\d{1,2}\s*分)?/g,
            // AM/PM表記
            /\b\d{1,2}:\d{2}\s*[AaPpMm]{2}\b/g
        ];

        let dates: string[] = [];
        const currentYear = new Date().getFullYear();

        for (const pattern of dateTimePatterns) {
            const matches = content.match(pattern) || [];
            dates = [...dates, ...matches.map(match => {
                // 日本語の時刻表現を変換
                if (match.includes('午前') || match.includes('午後')) {
                    const hour = parseInt(match.match(/\d{1,2}/)[0]);
                    const isPM = match.includes('午後');
                    const minutes = match.match(/(\d{1,2})\s*分/)?.[1] || '00';
                    const adjustedHour = isPM ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
                    const today = new Date();
                    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} ${String(adjustedHour).padStart(2, '0')}:${minutes}`;
                }

                // AM/PM表記を24時間表記に変換
                if (match.match(/[AaPpMm]{2}/)) {
                    const [time, meridiem] = match.split(/\s+/);
                    const [hour, minutes] = time.split(':');
                    const isPM = meridiem.toUpperCase() === 'PM';
                    const adjustedHour = isPM ? (parseInt(hour) === 12 ? 12 : parseInt(hour) + 12) : (parseInt(hour) === 12 ? 0 : parseInt(hour));
                    const today = new Date();
                    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} ${String(adjustedHour).padStart(2, '0')}:${minutes}`;
                }

                // 年が含まれていない場合は現在の年を追加
                if (!match.includes('-') && !match.includes('/')) {
                    const today = new Date();
                    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} ${match}`;
                }
                if (match.split(/[-/]/)[0].length === 2) {
                    return `${currentYear}-${match}`;
                }
                return match;
            })];
        }

        // 「まで」の表現を検出（より多くのパターンに対応）
        const hasUntilExpression = /まで|until|～|〜|から|より|の間|期間|during|for|until/.test(content);

        return {
            dates: [...new Set(dates)], // 重複を除去
            summary: content.length > 200 ? content.slice(0, 200) + '...' : content,
            hasUntilExpression
        };
    }
}

export type { PostData, OpenAIResponse, DateTimeInfo };
export { OpenAIClient };