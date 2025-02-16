import { DateTimeInfo } from "./api";

// カレンダーリンク生成のためのユーティリティ
export class CalendarLinkGenerator {
    // 日付文字列から DateTimeInfo を解析
    private static parseDateTimeString(dateStr: string): DateTimeInfo | null {
        try {
            const hasTime = dateStr.includes(':');
            let date: Date;

            if (hasTime) {
                // タイムゾーンを考慮した日時の解析
                date = new Date(dateStr.replace(' ', 'T') + '+09:00');
            } else {
                // YYYY-MM-DD 形式の場合
                const [year, month, day] = dateStr.split(/[-/]/).map(n => parseInt(n, 10));
                date = new Date(year, month - 1, day);
            }

            if (isNaN(date.getTime())) {
                return null;
            }

            return { date, hasTime };
        } catch (e) {
            console.error('Date parsing error:', e);
            return null;
        }
    }

    private static formatGoogleCalendarDate(dateInfo: DateTimeInfo): string {
        const date = dateInfo.date;
        if (dateInfo.hasTime) {
            // UTC形式で出力（Googleカレンダーの要件）
            return date.toISOString().replace(/[:-]/g, '').replace(/\.\d{3}/, '');
        } else {
            // YYYYMMDD形式（終日の予定用）
            return date.getFullYear().toString() +
                String(date.getMonth() + 1).padStart(2, '0') +
                String(date.getDate()).padStart(2, '0');
        }
    }

    static generateLink(
        summary: string,
        description: string,
        url: string,
        dates: string[],
        hasUntilExpression: boolean,
        postedAt?: string
    ): string {
        const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
        const params = new URLSearchParams();
        params.append('text', summary);

        const fullDescription = `${description}\n\nURL: ${url}`;
        params.append('details', fullDescription);

        // 日付の処理
        if (dates.length === 0) {
            // 投稿日時を使用（今日の終日の予定）
            const today = this.formatGoogleCalendarDate({ date: new Date(), hasTime: false });
            params.append('dates', `${today}/${today}`);
        } else if (dates.length === 1) {
            const dateInfo = this.parseDateTimeString(dates[0]);
            if (dateInfo) {
                const formattedDate = this.formatGoogleCalendarDate(dateInfo);

                if (hasUntilExpression && postedAt) {
                    // 「まで」の表現があり、投稿時間が利用可能な場合
                    const startDateInfo = this.parseDateTimeString(postedAt);
                    if (startDateInfo) {
                        const startDate = this.formatGoogleCalendarDate(startDateInfo);
                        params.append('dates', `${startDate}/${formattedDate}`);
                    } else {
                        // 投稿時間が解析できない場合は1日の予定として扱う
                        params.append('dates', `${formattedDate}/${formattedDate}`);
                    }
                } else if (dateInfo.hasTime) {
                    // 時間指定あり：1時間の予定
                    const endDate = new Date(dateInfo.date.getTime() + 60 * 60 * 1000);
                    const endDateInfo = { date: endDate, hasTime: true };
                    params.append('dates', `${formattedDate}/${this.formatGoogleCalendarDate(endDateInfo)}`);
                } else {
                    // 終日の予定
                    params.append('dates', `${formattedDate}/${formattedDate}`);
                }
            }
        } else if (dates.length === 2) {
            const startInfo = this.parseDateTimeString(dates[0]);
            const endInfo = this.parseDateTimeString(dates[1]);
            if (startInfo && endInfo) {
                const startDate = this.formatGoogleCalendarDate(startInfo);
                const endDate = this.formatGoogleCalendarDate(endInfo);
                params.append('dates', `${startDate}/${endDate}`);
            }
        }

        return `${baseUrl}&${params.toString()}`;
    }
}