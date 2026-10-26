import { defineMiddleware } from "astro:middleware";
import { withPhraseBreaks } from "./utils/phrase-break";

// 公開ページは WordPress と同じく末尾スラッシュ付きに揃える。
// astro.config の trailingSlash: "always" は EmDash の管理画面・API（/_emdash/...）まで
// 404 にするため使わず、ここで公開側だけリダイレクトする。
export const onRequest = defineMiddleware(async (context, next) => {
	const { pathname, search } = context.url;
	if (pathname.startsWith("/_") || pathname.startsWith("/api/") || /\.[a-z0-9]+$/i.test(pathname)) {
		return next();
	}
	if (pathname.endsWith("/") || pathname === "/404") {
		// 公開ページの日本語に文節の切れ目を入れる（src/utils/phrase-break.ts）。
		// 管理者がページ上で直接編集するとき（編集モード・プレビュー）は元の文のまま返す
		const editing = context.cookies.get("emdash-edit-mode")?.value === "true" || context.url.searchParams.has("_edit") || context.url.searchParams.has("_preview");
		return editing ? next() : withPhraseBreaks(await next());
	}
	// リダイレクトはページのキャッシュに入れない（EmDash の Route Caching の注意）
	context.cache?.set(false);
	return context.redirect(`${pathname}/${search}`, 301);
});
