import { defineMiddleware } from "astro:middleware";

// 公開ページは WordPress と同じく末尾スラッシュ付きに揃える。
// astro.config の trailingSlash: "always" は EmDash の管理画面・API（/_emdash/...）まで
// 404 にするため使わず、ここで公開側だけリダイレクトする。
export const onRequest = defineMiddleware((context, next) => {
	const { pathname, search } = context.url;
	if (pathname.endsWith("/") || pathname === "/404" || pathname.startsWith("/_") || /\.[a-z0-9]+$/i.test(pathname)) {
		return next();
	}
	return context.redirect(`${pathname}/${search}`, 301);
});
