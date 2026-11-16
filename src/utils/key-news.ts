// 鍵業界ニュース（2026-11-16 佐藤さん）の本文の組み替え（src/components/PostArticle.astro から使う）。
// 見出し（h2）ごとに1本のニュースの箱にし、中は「ベビちゃんの調べ」（元記事リンクと要約）と
// 「佐藤のコメント」（「佐藤のコメント：」で始まる段落）に分ける。
// 最初の見出しより前は、ベビちゃんのあいさつ。見出し「まとめ」「今週のまとめ」以降は最後の締めの箱。文字はそのまま。
export function toKeyNewsHtml(body: string): string {
	let newsHtml = "";
	const parts = body.split(/(?=<h2[\s>])/);
	let intro = parts[0].startsWith("<h2") ? "" : parts.shift()!;
	// アイキャッチ（あれば）はあいさつの上に
	const eyecatch = intro.match(/<figure class="post-eyecatch"[\s\S]*?<\/figure>/)?.[0] ?? "";
	intro = intro.replace(eyecatch, "");
	newsHtml += eyecatch;
	const isClosing = (h: string) => /^<h2[^>]*>\s*(?:今週の)?まとめ\s*<\/h2>/.test(h);
	const closeAt = parts.findIndex(isClosing);
	const items = closeAt >= 0 ? parts.slice(0, closeAt) : parts;
	const closing = closeAt >= 0 ? parts.slice(closeAt).join("").replace(/^<h2[^>]*>[\s\S]*?<\/h2>/, "") : "";
	const comment = /<p[^>]*>\s*佐藤のコメント\s*[：:]\s*([\s\S]*?)<\/p>/g;
	const baby = '<img src="/images/top/baby-face.webp" width="200" height="200" alt="" loading="lazy" decoding="async" />';
	const sato = '<img src="/images/news/sato-comment.webp" width="160" height="160" alt="" loading="lazy" decoding="async" />';
	const bubble = (comments: string[]) => comments.length ? `<div class="kn-comment">${sato}<div class="kn-bubble"><p class="kn-label">佐藤のコメント</p>${comments.join("")}</div></div>` : "";
	newsHtml += intro.trim() ? `<div class="kn-intro">${baby}<div class="kn-intro-text">${intro}</div></div>` : "";
	items.forEach((item, i) => {
		const h2 = item.match(/^<h2[^>]*>[\s\S]*?<\/h2>/)![0];
		let rest = item.slice(h2.length);
		const comments: string[] = [];
		rest = rest.replace(comment, (_m, text: string) => (comments.push(`<p>${text}</p>`), ""));
		// 「元記事：」のリンクだけの段落は、出どころの札に
		rest = rest.replace(/<p([^>]*)>(\s*<a [^>]*>\s*元記事[\s\S]*?<\/a>\s*)<\/p>/, '<p$1 class="kn-src">$2</p>');
		newsHtml += `<section class="kn-item"><p class="kn-no">NEWS ${String(i + 1).padStart(2, "0")}</p>${h2}`
			+ `<div class="kn-research"><p class="kn-label">${baby}ベビちゃんの調べ</p>${rest}</div>`
			+ bubble(comments)
			+ `</section>`;
	});
	if (closing.trim()) {
		const comments: string[] = [];
		const rest = closing.replace(comment, (_m, text: string) => (comments.push(`<p>${text}</p>`), ""));
		newsHtml += `<div class="kn-closing">${rest}${bubble(comments)}</div>`;
	}
	return newsHtml;
}
