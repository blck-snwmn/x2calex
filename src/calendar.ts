import type { DateTimeInfo } from "./api";

// カレンダーリンク生成のためのユーティリティ
export const CalendarLinkGenerator = {
	// 日付文字列から DateTimeInfo を解析
	parseDateTimeString(dateStr: string): DateTimeInfo | null {
		let date: Date;
		let hasTime = false;

		try {
			if (dateStr.includes("T")) {
				// ISO形式の日時
				date = new Date(dateStr);
				hasTime = true;
			} else if (dateStr.includes(":")) {
				// スペース区切りの日時形式
				date = new Date(`${dateStr.replace(" ", "T")}+09:00`);
				hasTime = true;
			} else {
				// YYYY-MM-DD形式
				date = new Date(dateStr);
			}

			if (Number.isNaN(date.getTime())) {
				console.warn("Invalid date format:", dateStr);
				return null;
			}

			return { date, hasTime };
		} catch (e) {
			console.error("Error parsing date:", e);
			return null;
		}
	},

	// Google Calendar用の日付フォーマットに変換
	formatGoogleCalendarDate(info: DateTimeInfo): string {
		const { date, hasTime } = info;
		if (hasTime) {
			// YYYYMMDDTHHMMSS形式
			return date
				.toISOString()
				.replace(/[:-]/g, "")
				.replace(/\.\d{3}/, "");
		}
		// YYYYMMDD形式（終日の予定用）
		return (
			String(date.getFullYear()) +
			String(date.getMonth() + 1).padStart(2, "0") +
			String(date.getDate()).padStart(2, "0")
		);
	},

	// Google Calendar用のURLを生成する
	generateUrl(
		title: string,
		description: string,
		dates: string[],
		postedAt: string | null,
		hasUntilExpression: boolean,
	): string {
		const params = new URLSearchParams({
			action: "TEMPLATE",
			text: title,
			details: description,
		});

		// 投稿日時の処理
		const postedDateInfo = postedAt
			? CalendarLinkGenerator.parseDateTimeString(postedAt)
			: null;
		console.log("Parsed posted date:", postedDateInfo);

		if (dates.length === 0) {
			if (postedDateInfo) {
				// 投稿時間から終日予定として作成
				const dateOnly = {
					date: postedDateInfo.date,
					hasTime: false,
				};
				const formattedDate =
					CalendarLinkGenerator.formatGoogleCalendarDate(dateOnly);
				params.append("dates", `${formattedDate}/${formattedDate}`);
				console.log("Using posted date for all-day event:", formattedDate);
			} else {
				// フォールバック：現在日付を使用
				const today = CalendarLinkGenerator.formatGoogleCalendarDate({
					date: new Date(),
					hasTime: false,
				});
				params.append("dates", `${today}/${today}`);
				console.log("Using today for all-day event:", today);
			}
		} else if (dates.length === 1) {
			const dateInfo = CalendarLinkGenerator.parseDateTimeString(dates[0]);
			if (dateInfo) {
				const formattedDate =
					CalendarLinkGenerator.formatGoogleCalendarDate(dateInfo);
				console.log("Single date info:", { dateInfo, formattedDate });

				if (hasUntilExpression && postedDateInfo) {
					// 「まで」の表現があり、投稿時間が利用可能な場合
					const startDate =
						CalendarLinkGenerator.formatGoogleCalendarDate(postedDateInfo);
					params.append("dates", `${startDate}/${formattedDate}`);
					console.log("Using posted date as start time:", {
						startDate,
						endDate: formattedDate,
					});
				} else if (dateInfo.hasTime) {
					// 時間指定がある場合は1時間の予定として作成
					const endDate = new Date(dateInfo.date.getTime() + 60 * 60 * 1000);
					const endDateInfo = { date: endDate, hasTime: true };
					const endFormatted =
						CalendarLinkGenerator.formatGoogleCalendarDate(endDateInfo);
					params.append("dates", `${formattedDate}/${endFormatted}`);
					console.log("One hour event:", {
						startDate: formattedDate,
						endDate: endFormatted,
					});
				} else {
					// 時間指定がない場合は終日の予定として作成
					params.append("dates", `${formattedDate}/${formattedDate}`);
					console.log("All-day event:", formattedDate);
				}
			}
		} else if (dates.length === 2) {
			const startInfo = CalendarLinkGenerator.parseDateTimeString(dates[0]);
			const endInfo = CalendarLinkGenerator.parseDateTimeString(dates[1]);
			if (startInfo && endInfo) {
				const startDate =
					CalendarLinkGenerator.formatGoogleCalendarDate(startInfo);
				const endDate = CalendarLinkGenerator.formatGoogleCalendarDate(endInfo);
				params.append("dates", `${startDate}/${endDate}`);
				console.log("Date range:", { startDate, endDate });
			}
		}

		const finalUrl = `https://calendar.google.com/calendar/render?${params.toString()}`;
		console.log("Generated URL:", finalUrl);
		return finalUrl;
	},
};
