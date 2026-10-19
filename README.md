# カギの安心太郎 HP（EmDash 版）

https://kagino-anshin-taro.com/ （今は WordPress）を [EmDash](https://github.com/emdash-cms/emdash) で作り直すためのリポジトリです。
今の URL はすべて変えません。公式テンプレート `starter-cloudflare`（EmDash 1.3.1）をもとにしています。

本番の WordPress と DNS は、この作業では触りません。

## URL の出し方

| URL | 中身 | ファイル |
|---|---|---|
| `/<スラッグ>/` | 固定ページ（親なし）。なければ投稿 | `src/pages/[...path].astro` |
| `/<親>/<スラッグ>/` | 親を持つ固定ページ（例 `/column/spare-oita-key-locksmith/`） | `src/pages/[...path].astro` |
| `/category/<スラッグ>/` | カテゴリー | `src/pages/category/[slug].astro` |
| `/author/<スラッグ>/` | 投稿者 | `src/pages/author/[slug].astro` |

- 末尾スラッシュのない公開 URL は `src/middleware.ts` で末尾スラッシュ付きへ 301 します。`astro.config` の `trailingSlash: "always"` は管理画面（`/_emdash/...`）まで 404 にするので使いません。
- 親子関係は固定ページの `parent_slug` 項目で持ちます。2階層まで対応しています。
- `/posts/...` と `/pages/...` は使いません。

## 手元で動かす

```sh
npm install
npm run dev          # http://localhost:4321/ 、管理画面は /_emdash/admin
```

## WordPress から取り込む

WordPress の「ツール → エクスポート」で出した WXR ファイルを、手元の開発サーバーに取り込みます。

```sh
npm run dev                                   # 別のターミナルで
npm run import:wxr -- export.xml              # 取り込み
npm run check:urls                            # urls/ の全 URL が 200 か確かめる
```

`scripts/import-wxr.mjs` は、EmDash 標準の取り込みで URL が崩れる3点を補います。

1. `wp:post_name` のパーセントエンコードを戻してから取り込みます。そのままだと日本語スラッグが 404 になります。
2. 投稿者を EmDash のユーザーに結び付けます。結び付けないと、30件ごとに別の投稿者が作られます。
3. 親を持つ固定ページに `parent_slug` を書きます。`wp:post_parent` は標準では取り込まれません。

本物のエクスポートがまだないときは、`urls/` から作るテストデータで試せます（本文はダミーです）。

```sh
python3 scripts/make-test-wxr.py > test.wxr.xml
npm run import:wxr -- test.wxr.xml
```

## `urls/`

今のサイトのサイトマップから取った URL 一覧です（2026-10-19 時点、固定ページ 39、投稿 78、アーカイブ 5）。

## まだ決まっていないこと・未対応

- トップページ `/` の中身（今はテンプレートの新着一覧）
- 一覧のページ送り。テンプレートは `?cursor=...` で、WordPress の `/page/2/` 形式ではありません。
- RSS フィード、画像 URL（`/wp-content/uploads/...`）
- 問い合わせフォーム。今と同じく wordpress@kagino-anshin-taro.com 経由で Slack #受付 に届くようにする必要があります。
- 本番の Cloudflare への配置。`wrangler.jsonc` の D1・R2 はまだ作っていません。
