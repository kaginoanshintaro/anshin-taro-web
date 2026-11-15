// トップの「佐藤の予定」: Googleカレンダーの公開アドレス（予定の有無のみ）を読んで、
// 今日から7日分の「予定あり」の時間帯だけを返す（2026-11-15 佐藤さん）。
// 件名・場所などは公開アドレスに載らない設定だが、念のためここでも時刻以外は読まない。

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** 表示する時間帯（日本時間）。PCの目盛り 9時〜17時（2時間ごと、最後の段は 17〜19時）に合わせる */
export const BUSY_START_HOUR = 9;
export const BUSY_END_HOUR = 19;
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export interface BusyBlock {
	/** 表示枠の上端からの位置（%） */
	top: number;
	/** 高さ（%） */
	height: number;
	/** 「予定あり」の文字を入れられるくらい長いか（1時間以上） */
	long: boolean;
}

export interface BusyDay {
	day: number;
	month: number;
	weekday: string;
	cls: "sat" | "sun" | "";
	blocks: BusyBlock[];
}

interface Span {
	start: number;
	end: number;
}

/** 20261027T020000Z / 20261027T110000（TZID 付き＝日本時間とみなす）/ 20261027（終日）を UTC ミリ秒にする */
function parseIcsDate(value: string, params: string): { ms: number; allDay: boolean } | null {
	const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value.trim());
	if (!m) return null;
	const [, y, mo, d, h, mi, s, z] = m;
	if (h === undefined) {
		// 終日の予定: 日本時間のその日の 0 時
		return { ms: Date.UTC(+y, +mo - 1, +d) - JST_OFFSET_MS, allDay: true };
	}
	const utc = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
	// Z が無いものは TZID の時刻。このカレンダーは Asia/Tokyo なので日本時間として扱う
	void params;
	return { ms: utc - (z ? 0 : JST_OFFSET_MS), allDay: false };
}

/** 折り返し行をつないで、VEVENT ごとの時刻と繰り返しルールだけを取り出す */
function parseEvents(ics: string) {
	const lines = ics.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
	const events: { start: number; end: number; allDay: boolean; rrule?: string; exdates: number[] }[] = [];
	let cur: { start?: number; end?: number; allDay?: boolean; rrule?: string; exdates: number[]; transparent?: boolean } | null = null;
	for (const line of lines) {
		if (line === "BEGIN:VEVENT") {
			cur = { exdates: [] };
			continue;
		}
		if (line === "END:VEVENT") {
			if (cur && cur.start !== undefined && !cur.transparent) {
				const end = cur.end ?? cur.start + (cur.allDay ? DAY_MS : 60 * 60 * 1000);
				events.push({ start: cur.start, end, allDay: !!cur.allDay, rrule: cur.rrule, exdates: cur.exdates });
			}
			cur = null;
			continue;
		}
		if (!cur) continue;
		const colon = line.indexOf(":");
		if (colon < 0) continue;
		const head = line.slice(0, colon);
		const value = line.slice(colon + 1);
		const [name, ...rest] = head.split(";");
		const params = rest.join(";");
		if (name === "DTSTART") {
			const p = parseIcsDate(value, params);
			if (p) {
				cur.start = p.ms;
				cur.allDay = p.allDay;
			}
		} else if (name === "DTEND") {
			const p = parseIcsDate(value, params);
			if (p) cur.end = p.ms;
		} else if (name === "RRULE") {
			cur.rrule = value;
		} else if (name === "EXDATE") {
			for (const v of value.split(",")) {
				const p = parseIcsDate(v, params);
				if (p) cur.exdates.push(p.ms);
			}
		} else if (name === "TRANSP" && value === "TRANSPARENT") {
			cur.transparent = true;
		}
	}
	return events;
}

const BYDAY: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

/** 繰り返しの予定を表示期間の分だけ展開する（毎日・毎週だけ対応。それ以外は1回目だけ） */
function expand(ev: ReturnType<typeof parseEvents>[number], from: number, to: number): Span[] {
	const dur = ev.end - ev.start;
	if (!ev.rrule) return [{ start: ev.start, end: ev.end }];
	const rule = Object.fromEntries(ev.rrule.split(";").map((kv) => kv.split("=") as [string, string]));
	const freq = rule.FREQ;
	if (freq !== "DAILY" && freq !== "WEEKLY") return [{ start: ev.start, end: ev.end }];
	const interval = Math.max(1, Number(rule.INTERVAL) || 1);
	const count = rule.COUNT ? Number(rule.COUNT) : Infinity;
	const until = rule.UNTIL ? (parseIcsDate(rule.UNTIL, "")?.ms ?? Infinity) : Infinity;
	const byday = freq === "WEEKLY" && rule.BYDAY ? rule.BYDAY.split(",").map((d: string) => BYDAY[d.slice(-2)]).filter((n: number | undefined) => n !== undefined) : null;
	const out: Span[] = [];
	const startWeekday = new Date(ev.start + JST_OFFSET_MS).getUTCDay();
	let n = 0;
	// 1日ずつ進めて条件に合う日を拾う（表示期間は7日なので十分軽い）
	for (let t = ev.start, i = 0; t < to && t <= until && n < count; t += DAY_MS, i++) {
		const wd = new Date(t + JST_OFFSET_MS).getUTCDay();
		let hit: boolean;
		if (freq === "DAILY") hit = i % interval === 0;
		else {
			const week = Math.floor((i + startWeekday) / 7);
			hit = week % interval === 0 && (byday ? byday.includes(wd) : wd === startWeekday);
		}
		if (!hit) continue;
		n++;
		if (ev.exdates.includes(t)) continue;
		if (t + dur > from) out.push({ start: t, end: t + dur });
	}
	return out;
}

/** 公開アドレス（iCal）の文字列から、今日（日本時間）から7日分を作る */
export function buildBusyWeek(ics: string, now: number = Date.now()): BusyDay[] {
	const todayJst = Math.floor((now + JST_OFFSET_MS) / DAY_MS) * DAY_MS - JST_OFFSET_MS; // 日本時間の今日 0 時（UTC ミリ秒）
	const from = todayJst;
	const to = todayJst + 7 * DAY_MS;
	const spans = parseEvents(ics).flatMap((ev) => expand(ev, from, to));
	const winLen = (BUSY_END_HOUR - BUSY_START_HOUR) * 60 * 60 * 1000;
	const days: BusyDay[] = [];
	for (let i = 0; i < 7; i++) {
		const dayStart = todayJst + i * DAY_MS;
		const winStart = dayStart + BUSY_START_HOUR * 60 * 60 * 1000;
		const winEnd = winStart + winLen;
		const clipped = spans
			.map((s) => ({ start: Math.max(s.start, winStart), end: Math.min(s.end, winEnd) }))
			.filter((s) => s.end > s.start)
			.sort((a, b) => a.start - b.start);
		// 重なる予定はひとつにまとめる
		const merged: Span[] = [];
		for (const s of clipped) {
			const last = merged[merged.length - 1];
			if (last && s.start <= last.end) last.end = Math.max(last.end, s.end);
			else merged.push({ ...s });
		}
		const d = new Date(dayStart + JST_OFFSET_MS);
		const wd = d.getUTCDay();
		days.push({
			day: d.getUTCDate(),
			month: d.getUTCMonth() + 1,
			weekday: WEEKDAYS[wd],
			cls: wd === 6 ? "sat" : wd === 0 ? "sun" : "",
			blocks: merged.map((s) => ({
				top: Math.round(((s.start - winStart) / winLen) * 1000) / 10,
				height: Math.round(((s.end - s.start) / winLen) * 1000) / 10,
				long: s.end - s.start >= 60 * 60 * 1000,
			})),
		});
	}
	return days;
}

/** 公開アドレスを読む。読めなかったときは null（予定欄を出さない。空いているように見せないため） */
export async function fetchBusyWeek(calendarId: string): Promise<BusyDay[] | null> {
	const url = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`;
	try {
		const res = await fetch(url, {
			signal: AbortSignal.timeout(4000),
			// Cloudflare の入口で10分だけ持っておく（毎回 Google に取りに行かない）
			cf: { cacheTtl: 600, cacheEverything: true },
		} as RequestInit);
		if (!res.ok) return null;
		const text = await res.text();
		if (!text.includes("BEGIN:VCALENDAR")) return null;
		return buildBusyWeek(text);
	} catch {
		return null;
	}
}
