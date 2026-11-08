/**
 * トップの固定背景エリアにいる安心太郎ちゃんのチャット（Q&A のテンプレート型）。
 * AI ではなく、質問のボタンを押すと、ここに書いた決まった答えを返すだけ（佐藤さんの決定 2026-11-08）。
 * 入力された文字はどこにも送らない（ブラウザの中でキーワードを探すだけ）。
 *
 * 答えはサイトにすでに載っていること（料金ページ・会社概要・サービス紹介・トップのあいさつ文）だけで書く。
 * 金額などは src/data/price.ts と src/site.ts から読むので、料金ページを直せばチャットの答えも変わる。
 *
 * 書き方:
 *   a     … 答えの吹き出し。配列の1つが1段落。[[文字|/path/]] はリンクのボタンになる。
 *   next  … 答えのあとに出す次の質問（id）。無ければ最初の質問一覧に戻る。
 *   words … 入力欄の文字に、これのどれかが入っていたらこの質問を候補に出す。
 */
import { paymentMethods, priceNotes, priceSections } from "./price";
import { site } from "../site";

export interface TaroQA {
	id: string;
	/** ボタンの文字（短く） */
	q: string;
	a: string[];
	next?: string[];
	words: string[];
}

const row = (sectionId: string, name: string) => {
	const r = priceSections.find((s) => s.id === sectionId)?.rows.find((x) => x.name === name);
	if (!r) throw new Error(`taro-chat: 料金が見つかりません ${sectionId} / ${name}`);
	// チャットの吹き出しは幅が狭いので「16,500 〜 22,000円」の空白を詰める（行頭に「〜」が来ないように）
	return r.price.replace(/\s*〜\s*/g, "〜");
};
const cancel = (label: string) => {
	const c = priceNotes.cancelFees.find((x) => x.label.startsWith(label));
	if (!c) throw new Error(`taro-chat: キャンセル料が見つかりません ${label}`);
	return c.price;
};
// 「・」は行の頭に来てしまうので、チャットでは「、」でつなぐ
const [oitaAreas, kumamotoAreas] = site.areas.split("・熊本県一部地域").map((s) => s.replace(/・/g, "、"));
const cards = paymentMethods.available.flatMap((g) => g.brands).join("・");
const soon = paymentMethods.soon.flatMap((g) => g.brands).join("・");

export const taroGreeting = "こんにちは、安心太郎だよ！聞きたいことを下のボタンからえらんでね。";

/** 最初に並べる質問（並び順どおり） */
export const taroMenu = ["price", "area", "car", "duplicate", "stiff", "place", "pay", "hurry"];

export const taroQA: TaroQA[] = [
	{
		id: "price",
		q: "料金を知りたい",
		words: ["料金", "値段", "いくら", "費用", "金額", "価格", "見積"],
		a: [
			`料金はぜんぶ出張料・税込みだよ。たとえば玄関の鍵開け（標準的なセキュリティーキー）は${row("house", "標準的なセキュリティーキーの玄関開錠")}、合鍵（標準キー）は${row("duplicate", "標準キー（ギザギザの鍵）")}。`,
			"夜20時〜朝8時は＋3,300円になるよ。ほかの料金は料金ページを見てね。",
			"[[サービス料金を見る|/price/]]",
		],
		next: ["cancel", "pay", "hurry"],
	},
	{
		id: "cancel",
		q: "キャンセル料は？",
		words: ["キャンセル", "取り消", "やめ"],
		a: [
			`お見積もり以外のサービスで、佐藤が出発したあとのキャンセルはキャンセル料がかかるよ。日中（8時〜20時）は${cancel("日中")}、深夜早朝（20時〜8時）は${cancel("深夜早朝")}だよ。`,
			"[[料金ページの注意を見る|/price/]]",
		],
	},
	{
		id: "area",
		q: "対応エリアは？",
		words: ["エリア", "地域", "場所", "どこまで", "出張", "来て", "熊本", "大分", "別府", "中津", "日田", "佐伯", "臼杵", "津久見", "竹田", "豊後", "杵築", "宇佐", "由布", "国東", "日出", "九重", "玖珠", "阿蘇"],
		a: [
			`大分県は、${oitaAreas}に出張するよ。`,
			`熊本県は一部の地域（${kumamotoAreas.replace(/^（|）$/g, "")}）だよ。`,
		],
		next: ["hurry", "price"],
	},
	{
		id: "car",
		q: "車の鍵をなくした",
		words: ["車", "自動車", "バイク", "スマートキー", "イモビ", "インロック", "閉じ込"],
		a: [
			`鍵が1本もなくても、出張してその場で作れるよ。国産車は${row("akl", "国産車")}、輸入車は${row("akl", "輸入車")}。`,
			`スマートキーなどイモビライザー付きの車は、費用の目安が国産車${row("immobilizer", "国産車")}。車検証の情報を準備してね。`,
			`車の中に鍵を閉じ込めたときの鍵開けは、国産車${row("car", "国産車の鍵開け")}だよ。メーカー・車種・年式を分かる範囲で教えてね。`,
			"[[鍵の作成を見る|/duplicate/]]",
		],
		next: ["hurry", "area"],
	},
	{
		id: "duplicate",
		q: "合鍵を作りたい",
		words: ["合鍵", "スペア", "コピー", "複製", "ディンプル"],
		a: [
			`元になる純正の鍵を持ってきてね。標準キー（ギザギザの鍵）は${row("duplicate", "標準キー（ギザギザの鍵）")}、ディンプルキーは${row("duplicate", "ディンプルキー（くぼみのある鍵）")}だよ。`,
			"純正ではない鍵からは、精度が悪くなるので基本お断りしているよ。特殊な鍵は日数がかかることもあるから、急ぐときは先に聞いてね。",
			"[[鍵の作成を見る|/duplicate/]]",
		],
		next: ["place", "price"],
	},
	{
		id: "stiff",
		q: "鍵が回りにくい",
		words: ["回りにく", "回らな", "かたい", "固い", "硬い", "引っかか", "折れ", "壊れ", "修理", "交換"],
		a: [
			`回りづらい鍵は、シリンダーの分解洗浄（${row("repair", "シリンダーの分解洗浄")}）でぐっと良くなることが多いよ。`,
			`鍵が折れたときの抜き取りは${row("repair", "折れた鍵の抜き取り")}。鍵の交換もできるよ。`,
			"[[鍵の修理・交換を見る|/repair/]]",
		],
		next: ["price", "hurry"],
	},
	{
		id: "place",
		q: "お店の場所",
		words: ["住所", "店", "場所", "アクセス", "地図", "どこ"],
		a: [
			`お店は〒${site.postalCode} ${site.addressLine}だよ。`,
			"[[会社概要・アクセスを見る|/profile/]]",
		],
	},
	{
		id: "pay",
		q: "支払い方法は？",
		words: ["支払", "カード", "クレジット", "電子マネー", "決済", "払"],
		a: [`クレジットカードは${cards}が使えるよ。${soon}は、いま使えるように準備しているところだよ。`, "[[料金ページの支払い方法を見る|/price/#payment]]"],
		next: ["price"],
	},
	{
		id: "hurry",
		q: "すぐ来てほしい",
		words: ["すぐ", "急ぎ", "今から", "至急", "依頼", "頼み", "電話", "連絡", "LINE", "ライン", "相談"],
		a: [
			"急ぎのときは電話がいちばん早いよ。佐藤が直接電話に出るよ。",
			"佐藤が一人で電話から作業までしているので、依頼が重なると少しお待ちいただくこともあるよ。",
			`[[電話する ${site.tel.label}|${site.tel.href}]] [[LINEで相談する|${site.line}]]`,
		],
	},
	{
		id: "choose",
		q: "鍵屋さん選びの注意",
		words: ["高額", "ぼったくり", "注意", "選び", "悪徳", "詐欺"],
		a: ["鍵屋さんを呼ぶ前に、ぜひチェックしてほしいポイントをまとめたよ。", "[[5つのポイントを見る|/check-points/]]"],
	},
];

/** どの質問にも当てはまらない文字が入力されたとき */
export const taroNoMatch = "ごめんね、その質問にはまだ答えられないよ。下のボタンからえらぶか、電話かLINEで佐藤に聞いてね。";
