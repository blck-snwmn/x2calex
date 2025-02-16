import { DateTimeInfo } from "./api";

// カレンダーリンク生成のためのユーティリティ
export class CalendarLinkGenerator {
    // 日付文字列から DateTimeInfo を解析
    private static parseDateTimeString(dateStr: string): DateTimeInfo | null {
        try {
            let date: Date;
            let hasTime: boolean;

            // ISO形式の日時文字列かどうかをチェック
            if (dateStr.includes('T') || dateStr.includes('Z')) {
                // ISO形式の日時
                date = new Date(dateStr);
                hasTime = true;
            } else if (dateStr.includes(':')) {
                // スペース区切りの日時形式
                date = new Date(dateStr.replace(' ', 'T') + '+09:00');
                hasTime = true;
            } else {
                // YYYY-MM-DD 形式の場合
                const [year, month, day] = dateStr.split(/[-/]/).map(n => parseInt(n, 10));
                date = new Date(year, month - 1, day);
                hasTime = false;
            }

            if (isNaN(date.getTime())) {
                console.warn('Invalid date format:', dateStr);
                return null;
            }

            return { date, hasTime };
        } catch (e) {
            console.error('Date parsing error:', e, 'for date string:', dateStr);
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
        console.log('Generating calendar link with:', {
            summary,
            dates,
            hasUntilExpression,
            postedAt
        });

        const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
        const params = new URLSearchParams();
        params.append('text', summary);

        const fullDescription = `${description}\n\nURL: ${url}`;
        params.append('details', fullDescription);

        // 投稿日時の処理
        const postedDateInfo = postedAt ? this.parseDateTimeString(postedAt) : null;
        console.log('Parsed posted date:', postedDateInfo);

        // 日付の処理
        if (dates.length === 0) {
            // 投稿日時を使用（投稿日の終日の予定）
            if (postedDateInfo) {
                // 投稿日時から日付のみを使用（終日予定）
                const dateOnly = {
                    date: new Date(
                        postedDateInfo.date.getFullYear(),
                        postedDateInfo.date.getMonth(),
                        postedDateInfo.date.getDate()
                    ),
                    hasTime: false
                };
                const formattedDate = this.formatGoogleCalendarDate(dateOnly);
                params.append('dates', `${formattedDate}/${formattedDate}`);
                console.log('Using posted date for all-day event:', formattedDate);
            } else {
                // フォールバック：現在日付を使用
                const today = this.formatGoogleCalendarDate({ date: new Date(), hasTime: false });
                params.append('dates', `${today}/${today}`);
                console.log('Using fallback current date:', today);
            }
        } else if (dates.length === 1) {
            const dateInfo = this.parseDateTimeString(dates[0]);
            if (dateInfo) {
                const formattedDate = this.formatGoogleCalendarDate(dateInfo);
                console.log('Single date info:', { dateInfo, formattedDate });

                if (hasUntilExpression && postedDateInfo) {
                    // 「まで」の表現があり、投稿時間が利用可能な場合
                    const startDate = this.formatGoogleCalendarDate(postedDateInfo);
                    params.append('dates', `${startDate}/${formattedDate}`);
                    console.log('Using posted date as start time:', { startDate, endDate: formattedDate });
                } else if (dateInfo.hasTime) {
                    // 時間指定あり：1時間の予定
                    const endDate = new Date(dateInfo.date.getTime() + 60 * 60 * 1000);
                    const endDateInfo = { date: endDate, hasTime: true };
                    const endFormatted = this.formatGoogleCalendarDate(endDateInfo);
                    params.append('dates', `${formattedDate}/${endFormatted}`);
                    console.log('One hour event:', { start: formattedDate, end: endFormatted });
                } else {
                    // 終日の予定
                    params.append('dates', `${formattedDate}/${formattedDate}`);
                    console.log('All-day event:', formattedDate);
                }
            }
        } else if (dates.length === 2) {
            const startInfo = this.parseDateTimeString(dates[0]);
            const endInfo = this.parseDateTimeString(dates[1]);
            if (startInfo && endInfo) {
                const startDate = this.formatGoogleCalendarDate(startInfo);
                const endDate = this.formatGoogleCalendarDate(endInfo);
                params.append('dates', `${startDate}/${endDate}`);
                console.log('Date range:', { startDate, endDate });
            }
        }

        const finalUrl = `${baseUrl}&${params.toString()}`;
        console.log('Final calendar URL:', finalUrl);
        return finalUrl;
    }
}