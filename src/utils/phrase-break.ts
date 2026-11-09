/*
 * 日本語の文節の切れ目に <wbr>（改行してよい位置）を入れる（佐藤さんの依頼 2026-10-25）。
 * 「安心太/郎」のように単語の途中で改行されないよう、Base.astro の「改行の位置」で CSS の
 * word-break: keep-all を当てて文字ごとの改行を止め、ここで入れた <wbr> の位置でだけ改行させる。
 *
 * - CSS の word-break: auto-phrase は Chrome・Edge だけで、iPhone（Safari）と Firefox は未対応のため、
 *   サーバー側で Google の BudouX（文節の区切りを推定する小さなモデル）を使う。ブラウザに JS は送らない。
 * - Cloudflare の HTMLRewriter で流しながら書き換えるので、ページ全体を貯めて組み直すことはしない。
 * - <wbr> は文字ではないので、検索・コピー・読み上げには影響しない。
 */
import { jaModel, Parser } from "budoux";

const parser = new Parser(jaModel);

// ひらがな・カタカナ・漢字を含む文だけ区切る
const JA = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/;
// 文字参照（&amp; など）の途中には入れない
const ENTITY = /&#?[a-z0-9]+;/gi;
// ハイフンでつないだ番号（住所の番地・電話番号）
const NUMBER_RUN = /[0-9０-９]+(?:[-‐−–ー－][0-9０-９]+)+/g;
const LONG_CHUNK = 10;
// 1: カタカナ、2: 漢字、0: それ以外
const scriptOf = (c: string) => (/[\u30a0-\u30ff]/.test(c) ? 1 : /[\u3400-\u9fff\uf900-\ufaff]/.test(c) ? 2 : 0);
// 中身を書き換えてはいけない要素
const SKIP = "script, style, textarea, select, pre, code, svg, math, noscript, template, title";

export function insertPhraseBreaks(text: string): string {
	if (text.length < 4) return text;
	// 「1-3-1」「097-560-0687」のような番号は途中で折らない（ハイフンの後ろは英数字の決まりで折れてしまうため）
	const runs = [...text.matchAll(NUMBER_RUN)].filter((m) => !/&#?[a-z0-9]*$/i.test(text.slice(0, m.index)));
	const ja = JA.test(text);
	if (!ja && runs.length === 0) return text;

	const noBreak: boolean[] = [];
	for (const m of text.matchAll(ENTITY)) {
		for (let i = m.index! + 1; i < m.index! + m[0].length; i++) noBreak[i] = true;
	}
	const runStart = new Set<number>();
	const runEnd = new Set<number>();
	for (const m of runs) {
		runStart.add(m.index!);
		runEnd.add(m.index! + m[0].length);
		for (let i = m.index! + 1; i < m.index! + m[0].length; i++) noBreak[i] = true;
	}
	const breaks = new Set<number>();
	if (ja) {
		let pos = 0;
		for (const chunk of parser.parse(text)) {
			// 「第一グリーンプラザビル東側簡易店舗」のような長いかたまりは、枠からはみ出して適当な位置で
			// 折られるよりはと、カタカナと漢字の変わり目でも区切る
			if (chunk.length > LONG_CHUNK) {
				for (let i = 1; i < chunk.length; i++) if (scriptOf(chunk[i - 1]) * scriptOf(chunk[i]) === 2) breaks.add(pos + i);
			}
			breaks.add((pos += chunk.length));
		}
	}
	// 番号の前後が日本語なら、そこでも折れるようにする
	for (const m of runs) {
		const end = m.index! + m[0].length;
		if (JA.test(text[m.index! - 1] ?? "")) breaks.add(m.index!);
		if (JA.test(text[end] ?? "")) breaks.add(end);
	}

	let out = "";
	for (let i = 0; i < text.length; i++) {
		// 空白の隣はもともと改行できるので入れない
		if (breaks.has(i) && !noBreak[i] && !/\s/.test(text[i - 1]) && !/\s/.test(text[i])) out += "<wbr>";
		if (runStart.has(i)) out += '<span class="nobr">';
		out += text[i];
		if (runEnd.has(i + 1)) out += "</span>";
	}
	return out;
}

export function withPhraseBreaks(response: Response): Response {
	if (typeof HTMLRewriter === "undefined") return response;
	if (!response.headers.get("content-type")?.includes("text/html")) return response;

	let skipDepth = 0;
	let buffer = "";
	return new HTMLRewriter()
		.on(SKIP, {
			element(el) {
				skipDepth++;
				el.onEndTag(() => {
					skipDepth--;
				});
			},
		})
		.on("body", {
			text(chunk) {
				if (skipDepth > 0) return;
				// 1つの文字列が細切れで届くことがあるので、まとめてから区切る
				buffer += chunk.text;
				if (!chunk.lastInTextNode) {
					chunk.remove();
					return;
				}
				chunk.replace(insertPhraseBreaks(buffer), { html: true });
				buffer = "";
			},
		})
		.transform(response);
}
