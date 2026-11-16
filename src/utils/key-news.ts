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
	// 見出しが「佐藤のコメント」の段は、直前のニュースの箱の中に佐藤の吹き出しとして入れる（2026-11-16 佐藤さん）
	const plain = (h: string) => h.replace(/<[^>]+>/g, "").trim();
	const boxes: { head: string; rest: string; comments: string[] }[] = [];
	items.forEach((item) => {
		const h2 = item.match(/^<h2[^>]*>[\s\S]*?<\/h2>/)![0];
		let rest = item.slice(h2.length);
		const comments: string[] = [];
		rest = rest.replace(comment, (_m, text: string) => (comments.push(`<p>${text}</p>`), ""));
		if (/^佐藤のコメント/.test(plain(h2))) {
			const all = rest.trim() ? [rest, ...comments] : comments;
			if (boxes.length) boxes[boxes.length - 1].comments.push(...all);
			else boxes.push({ head: "", rest: "", comments: all });
			return;
		}
		// 「元記事：」のリンクだけの段落は、出どころの札に
		rest = rest.replace(/<p([^>]*)>(\s*<a [^>]*>\s*元記事[\s\S]*?<\/a>\s*)<\/p>/, '<p$1 class="kn-src">$2</p>');
		// 箱の頭はベビちゃんの顔と「ベビちゃんの調べ」。見出しが「ニュースの内容」ならそれと置き換え、ニュースの題名なら下に残す
		const head = /^ニュースの内容$/.test(plain(h2))
			? `<h2 class="kn-head">${baby}ベビちゃんの調べ</h2>`
			: `<p class="kn-head">${baby}ベビちゃんの調べ</p>${h2}`;
		boxes.push({ head, rest, comments });
	});
	for (const b of boxes) {
		newsHtml += `<section class="kn-item">${b.head}`
			+ (b.rest.trim() ? `<div class="kn-research">${b.rest}</div>` : "")
			+ bubble(b.comments)
			+ `</section>`;
	}
	if (closing.trim()) {
		const comments: string[] = [];
		const rest = closing.replace(comment, (_m, text: string) => (comments.push(`<p>${text}</p>`), ""));
		newsHtml += `<div class="kn-closing">${rest}${bubble(comments)}</div>`;
	}
	return newsHtml;
}
