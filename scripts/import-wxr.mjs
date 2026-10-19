#!/usr/bin/env node
// WordPress のエクスポート（WXR）を、ローカルの EmDash（npm run dev）に今と同じ URL で取り込む。
//
//   npm run dev                          # 別のターミナルで起動しておく
//   npm run import:wxr -- export.xml [http://localhost:4321]
//
// EmDash 1.3.1 の標準取り込みだけでは URL が保てないため、次を補う。
//   1. wp:post_name のパーセントエンコードを先に戻す（そのままだと日本語スラッグが 404）
//   2. 投稿者を EmDash のユーザーに結び付ける（30件ごとに別の投稿者が作られるのを防ぐ）
//   3. 親を持つ固定ページに parent_slug を設定する（wp:post_parent は取り込まれない）
// ログインは開発用のバイパスを使うので、localhost でしか動かない。
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const [wxrPath, base = "http://localhost:4321"] = process.argv.slice(2);
if (!wxrPath) {
	console.error("usage: npm run import:wxr -- <export.xml> [base-url]");
	process.exit(1);
}
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
	console.error("ローカルの開発サーバーにだけ取り込めます:", base);
	process.exit(1);
}

const xml = fs
	.readFileSync(wxrPath, "utf8")
	.replace(/<wp:post_name><!\[CDATA\[(.*?)\]\]><\/wp:post_name>/g, (m, name) => {
		try {
			return `<wp:post_name><![CDATA[${decodeURIComponent(name)}]]></wp:post_name>`;
		} catch {
			return m;
		}
	});

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

// 開発用バイパスでログインする
const bypass = await fetch(`${base}/_emdash/api/setup/dev-bypass`, { redirect: "manual" });
const cookie = (bypass.headers.get("set-cookie") ?? "").split(";")[0];
if (!cookie) throw new Error(`ログインできませんでした (${bypass.status})`);
const headers = { cookie, "X-EmDash-Request": "1" };

async function api(path, init = {}) {
	const res = await fetch(`${base}/_emdash/api${path}`, { ...init, headers: { ...headers, ...init.headers } });
	const json = await res.json();
	if (!res.ok) throw new Error(`${path}: ${res.status} ${JSON.stringify(json)}`);
	return json.data;
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

async function execute(phase, cursor, chunk) {
	const form = new FormData();
	form.set("file", new File([xml], "export.xml", { type: "text/xml" }));
	form.set("config", config);
	form.set("phase", phase);
	if (cursor) form.set("cursor", JSON.stringify(cursor));
	if (chunk) form.set("chunk", JSON.stringify(chunk));
	return api("/import/wordpress/execute", { method: "POST", body: form });
}

let step = await execute("taxonomy");
console.log("taxonomy:", JSON.stringify(step.result.taxonomies));
const total = { imported: 0, skipped: 0, errors: [] };
do {
	step = await execute("content", step.cursor, step.chunk);
	total.imported += step.result.imported;
	total.skipped += step.result.skipped;
	total.errors.push(...step.result.errors);
} while (!step.done);
await execute("finalize", step.cursor, step.chunk);
console.log(`imported: ${total.imported}, skipped: ${total.skipped}, errors: ${total.errors.length}`);
for (const e of total.errors) console.log("  error:", e.title, e.error);

// 親ページを parent_slug に書く
const byId = new Map(items.map((i) => [i.id, i]));
const emdash = (...args) =>
	execFileSync("npx", ["emdash", ...args, "--url", base, "--json"], {
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
