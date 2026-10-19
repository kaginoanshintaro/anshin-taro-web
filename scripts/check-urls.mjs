#!/usr/bin/env node
// urls/ にある今のサイトの URL を、手元のサーバーで全部開いて 200 かを確かめる。
//   npm run check:urls -- [http://localhost:4321]
import fs from "node:fs";

const base = process.argv[2] ?? "http://localhost:4321";
const dir = new URL("../urls/", import.meta.url);
const urls = fs
	.readdirSync(dir)
	.filter((f) => f.endsWith(".txt"))
	.flatMap((f) => fs.readFileSync(new URL(f, dir), "utf8").split("\n"))
	.map((l) => l.trim())
	.filter((l) => l.startsWith("/"));

const failed = [];
for (const url of urls) {
	const res = await fetch(base + url, { redirect: "manual" });
	if (res.status !== 200) failed.push(`${res.status} ${decodeURIComponent(url)}`);
}
console.log(`${urls.length - failed.length}/${urls.length} が 200`);
for (const f of failed) console.log("  " + f);
process.exit(failed.length ? 1 : 0);
