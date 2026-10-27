#!/usr/bin/env node
// WordPress のエクスポート（WXR）を、ローカルの EmDash（npm run dev）に今と同じ URL で取り込む。
//
//   npm run dev                          # 別のターミナルで起動しておく
//   npm run import:wxr -- export.xml [http://localhost:4321]
//   npm run import:wxr -- export.xml https://anshin-taro-web.kagino-anshin-taro.workers.dev
//
// localhost 以外（テスト用 workers.dev）に取り込むときは、管理画面で作った admin スコープの
// API トークンを EMDASH_TOKEN に入れる（クラウド環境ではプロキシが Authorization を付けるので不要）。
//
// EmDash 1.3.1 の標準取り込みだけでは URL が保てないため、次を補う。
//   1. wp:post_name のパーセントエンコードを先に戻す（そのままだと日本語スラッグが 404）
//   2. 投稿者を EmDash のユーザーに結び付ける（30件ごとに別の投稿者が作られるのを防ぐ）
//   3. 親を持つ固定ページに parent_slug を設定する（wp:post_parent は取り込まれない）
//   4. 投稿・固定ページ・画像以外の item を外す（Contact Form 7 のフォームが持つ _locale=ja を
//      EmDash が多言語設定と読み、カテゴリー名がスラッグのままの "ja" 版が増えるため）
// localhost では開発用のバイパスでログインする。
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const [wxrPath, base = "http://localhost:4321"] = process.argv.slice(2);
if (!wxrPath) {
	console.error("usage: npm run import:wxr -- <export.xml> [base-url]");
	process.exit(1);
}
const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base);
if (!local && !/^https:\/\/[a-z0-9-]+\.kagino-anshin-taro\.workers\.dev$/.test(base)) {
	console.error("ローカルの開発サーバーかテスト用 workers.dev にだけ取り込めます:", base);
	process.exit(1);
}
// プロキシが Authorization を差し替える環境では、値はダミーでよい
const token = local ? null : process.env.EMDASH_TOKEN || "injected-by-proxy";

const xml = fs
	.readFileSync(wxrPath, "utf8")
	.replace(/<wp:post_name><!\[CDATA\[(.*?)\]\]><\/wp:post_name>/g, (m, name) => {
		try {
			return `<wp:post_name><![CDATA[${decodeURIComponent(name)}]]></wp:post_name>`;
		} catch {
			return m;
		}
	})
	.replace(/<item>[\s\S]*?<\/item>\s*/g, (item) =>
		/<wp:post_type><!\[CDATA\[(post|page|attachment)\]\]><\/wp:post_type>/.test(item) ? item : "",
	);

function tag(item, name) {
	const m = item.match(new RegExp(`<wp:${name}>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?</wp:${name}>`, "s"));
	return m ? m[1] : "";
}
const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => ({
	id: tag(item, "post_id"),
	slug: tag(item, "post_name"),
	parent: tag(item, "post_parent"),
	type: tag(item, "post_type"),
}));
const logins = [...xml.matchAll(/<wp:author_login><!\[CDATA\[(.*?)\]\]>/g)].map((m) => m[1]);

const headers = { "X-EmDash-Request": "1" };
if (token) {
	headers.authorization = `Bearer ${token}`;
} else {
	// 開発用バイパスでログインする
	const bypass = await fetch(`${base}/_emdash/api/setup/dev-bypass`, { redirect: "manual" });
	const cookie = (bypass.headers.get("set-cookie") ?? "").split(";")[0];
	if (!cookie) throw new Error(`ログインできませんでした (${bypass.status})`);
	headers.cookie = cookie;
}

async function api(path, init = {}) {
	// 無料プランの Worker は処理時間の上限（Error 1102）で落ちることがあるので、数回までやり直す
	for (let attempt = 1; ; attempt++) {
		const res = await fetch(`${base}/_emdash/api${path}`, { ...init, headers: { ...headers, ...init.headers } });
		const text = await res.text();
		let json;
		try {
			json = JSON.parse(text);
		} catch {
			if (attempt < 5 && res.status >= 500) {
				await new Promise((r) => setTimeout(r, 2000 * attempt));
				continue;
			}
			throw new Error(`${path}: ${res.status} ${text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 300)}`);
		}
		if (!res.ok) throw new Error(`${path}: ${res.status} ${JSON.stringify(json)}`);
		return json.data;
	}
}

const me = await api("/auth/me");
const config = JSON.stringify({
	postTypeMappings: {
		post: { collection: "posts", enabled: true },
		page: { collection: "pages", enabled: true },
	},
	skipExisting: true,
	authorMappings: Object.fromEntries(logins.map((login) => [login, me.id])),
});

async function execute(file, phase, cursor, chunk) {
	const form = new FormData();
	form.set("file", new File([file], "export.xml", { type: "text/xml" }));
	form.set("config", config);
	form.set("phase", phase);
	if (cursor) form.set("cursor", JSON.stringify(cursor));
	if (chunk) form.set("chunk", JSON.stringify(chunk));
	return api("/import/wordpress/execute", { method: "POST", body: form });
}

// workers.dev（無料プラン）は1回の処理時間が短いので、WXR を数件ずつのファイルに分けて送る
const batchSize = Number(process.env.IMPORT_BATCH) || (local ? Infinity : 3);
const first = xml.indexOf("<item>");
const last = xml.lastIndexOf("</item>") + "</item>".length;
const itemXml = first < 0 ? [] : xml.slice(first, last).match(/<item>[\s\S]*?<\/item>/g);
const files = [];
for (let i = 0; i < itemXml.length; i += batchSize) {
	files.push(xml.slice(0, first) + itemXml.slice(i, i + batchSize).join("\n") + xml.slice(last));
}

const total = { imported: 0, skipped: 0, errors: [] };
for (const [n, file] of files.entries()) {
	let step = await execute(file, "taxonomy");
	if (n === 0) console.log("taxonomy:", JSON.stringify(step.result.taxonomies));
	do {
		step = await execute(file, "content", step.cursor, step.chunk);
		total.imported += step.result.imported;
		total.skipped += step.result.skipped;
		total.errors.push(...step.result.errors);
	} while (!step.done);
	await execute(file, "finalize", step.cursor, step.chunk);
	if (files.length > 1) console.log(`  ${n + 1}/${files.length}`);
}
console.log(`imported: ${total.imported}, skipped: ${total.skipped}, errors: ${total.errors.length}`);
for (const e of total.errors) console.log("  error:", e.title, e.error);

// 親ページを parent_slug に書く
const byId = new Map(items.map((i) => [i.id, i]));
const emdash = (...args) =>
	execFileSync("npx", ["emdash", ...args, "--url", base, ...(token ? ["--token", token] : []), "--json"], {
		encoding: "utf8",
		env: { ...process.env, NODE_NO_WARNINGS: "1" },
	});
for (const page of items.filter((i) => i.type === "page" && i.parent && i.parent !== "0")) {
	const parent = byId.get(page.parent);
	if (!parent) {
		console.log("  親が見つかりません:", page.slug);
		continue;
	}
	const { _rev } = JSON.parse(emdash("content", "get", "pages", page.slug));
	emdash("content", "update", "pages", page.slug, "--rev", _rev, "--data", JSON.stringify({ parent_slug: parent.slug }));
	console.log(`  parent_slug: ${parent.slug}/${page.slug}`);
}
