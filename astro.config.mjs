import cloudflare from "@astrojs/cloudflare";
import { cacheCloudflare } from "@astrojs/cloudflare/cache";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	// 公開ページを Cloudflare の入口（Workers Cache）に置き、毎回データベースを読まないようにする。
	// 記事や設定を変えると EmDash がタグで自動的に消すので、公開はすぐ反映される。
	// maxAge は消し忘れたときの上限（1時間）。swr の間は古いものを返しつつ裏で作り直す。
	// [...path] のページ（固定ページ・投稿）は /_emdash/ まで当たらないよう、ページの中で指定する。
	cache: {
		provider: cacheCloudflare(),
	},
	routeRules: {
		"/": { maxAge: 3600, swr: 86400, tags: ["posts", "pages", "all"] },
		"/price": { maxAge: 3600, swr: 86400, tags: ["all"] },
		"/profile": { maxAge: 3600, swr: 86400, tags: ["all"] },
		"/examples": { maxAge: 3600, swr: 86400, tags: ["all"] },
		"/category/[slug]": { maxAge: 3600, swr: 86400, tags: ["posts", "all"] },
		"/tag/[slug]": { maxAge: 3600, swr: 86400, tags: ["posts", "all"] },
		"/author/[slug]": { maxAge: 3600, swr: 86400, tags: ["posts", "all"] },
	},
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto", coalesce: true }),
			storage: r2({ binding: "MEDIA" }),
			// キャッシュしたページでも、ログイン中の編集ボタンが出るようにする
			toolbar: "client",
		}),
	],
	devToolbar: { enabled: false },
});
