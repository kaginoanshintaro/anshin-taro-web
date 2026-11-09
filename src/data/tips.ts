/**
 * お役立ち情報（/tipshints/）の一覧に並べる記事とカテゴリ。
 *
 * 記事は今の WordPress から集めたもの（2026-11-09 確認）:
 *   - 今の /tipshints/ の「お役立ちコンテンツ 目次」と、サイドバーの「お役立ち」メニューにある固定ページ
 *   - 「やってみよう！自分でできるカギ交換！」の続き（STEP 1・シリンダー錠編など5ページ）
 *   - /column/ の下にあるコラム10本
 *   - ブログの「ヒント」カテゴリ（category/tips）の投稿。これは EmDash から自動で読むので、ここには書かない
 * 今の目次にあった「ハチの巣駆除事業」と「リンク集」は、メニューから外した方針（src/site.ts）に合わせて載せていない。
 *
 * カテゴリの分け方はこちらの案（今のサイトにはテーマ別の分類が無いため）。佐藤さんの確認待ち。
 * title は EmDash にページが無かったときの予備。ふだんは EmDash のページの題名を出す。
 */
export type TipLink = {
	/** 今のサイトと同じパス（日本語はデコードした形） */
	path: string;
	title: string;
	/** 続きのページ（シリーズの STEP など）。一覧では親の下に字下げして出す */
	children?: TipLink[];
};

export type TipGroup = {
	id: string;
	title: string;
	lead: string;
	links: TipLink[];
};

export const tipsTitle = "お役立ち情報";
export const tipsLead =
	"鍵や錠前のしくみ、自分でできるメンテナンス、鍵屋さんの選び方など、カギの安心太郎がまとめた記事の一覧です。";

export const tipGroups: TipGroup[] = [
	{
		id: "basics",
		title: "鍵と錠前のしくみ",
		lead: "鍵の用語や、シリンダー錠の防犯のしくみを、はじめての方にもわかるように解説しています。",
		links: [
			{ path: "/錠前と鍵の基本のキ：初心者でもわかるカンタン/", title: "錠前と鍵の基本のキ：初心者でもわかるカンタン用語解説" },
			{ path: "/シリンダー錠の構造と防犯性能：ピンタンブラー/", title: "シリンダー錠の構造と防犯性能：ピンタンブラー方式とロッキングバー方式とは？" },
		],
	},
	{
		id: "diy",
		title: "自分でできるメンテナンス・カギ交換",
		lead: "動画つきの記事もあります。カギ交換をするときは、先に「注意事項編」を読んでください。",
		links: [
			{ path: "/maintenance/", title: "鍵シリンダーの分解洗浄とメンテナンス方法：自分でできる！手順と注意点" },
			{ path: "/howtoremove-key-cylinder/", title: "カギの修理交換、メンテナンスに！錠前の取り外し方法基本の３パターン" },
			{ path: "/door_knob_tips/", title: "ドアノブの修理メンテ交換まるわかり！これでOK！自分でできるシリーズ第３弾" },
			{
				path: "/how-to-change-key/",
				title: "やってみよう！自分でできるカギ交換！〜注意事項編〜",
				children: [
					{ path: "/how-to-change-key-step1/", title: "やってみよう！自分でできるカギ交換！〜STEP 1〜" },
					{ path: "/how-to-change-key-cylinder/", title: "やってみよう！自分でできるカギ交換！〜シリンダー錠編〜" },
					{ path: "/how-to-change-lock-box/", title: "やってみよう！自分でできるカギ交換！〜面付箱錠編〜" },
					{ path: "/how-to-change-ra/", title: "RA型 面付箱錠のシリンダー交換方法" },
					{ path: "/how-to-change-handle-cylinder/", title: "プッシュプル錠 交換方法" },
				],
			},
		],
	},
	{
		id: "spare",
		title: "合鍵・スペアキー",
		lead: "合鍵やスペアキーの種類と、作るときの注意点です。",
		links: [
			{ path: "/column/type-oita-key-locksmith/", title: "【大分】鍵屋で作るスペアキーの種類と作成時の注意点" },
			{ path: "/column/copyservice-oita-key/", title: "【大分】鍵の複製が必要な状況・鍵複製サービスの特徴とは？" },
			{ path: "/column/spare-oita-key-locksmith/", title: "【大分】鍵屋による合鍵作成とは？DIYで行う簡単な防犯対策をご紹介" },
		],
	},
	{
		id: "trouble",
		title: "鍵のトラブルと鍵屋さんの選び方",
		lead: "よくある鍵のトラブルと対処のしかた、費用をおさえるコツ、業者の選び方です。",
		links: [
			{ path: "/column/trouble-point-oita-key/", title: "【大分】よくある鍵トラブルとは？鍵開け・修理業者選びのポイントも解説" },
			{ path: "/column/solution-step-oita-key/", title: "【大分】鍵トラブル解決の基本ステップ・解錠後のトラブル予防法を徹底解説" },
			{ path: "/column/guide-unlock-oita-key/", title: "大分の鍵開けサービス完全ガイド！安心して利用できる鍵開けサービスの選び方" },
			{ path: "/column/exchange-oita-key/", title: "【大分】鍵交換・取り付け業者を選ぶポイントとよくある質問" },
			{ path: "/column/cost-tips-oita-key/", title: "【大分】鍵の交換・修理を安い費用に抑えるコツと鍵トラブルを防ぐ注意点" },
		],
	},
	{
		id: "car",
		title: "車の鍵と盗難対策",
		lead: "車の鍵のトラブルの防ぎ方と、車両盗難の手口と対策です。",
		links: [
			{ path: "/auto_security/", title: "愛車を守る新常識：最新車両盗難の手口と「多層防御」の教科書" },
			{ path: "/column/car-trouble-oita-key/", title: "大分で車の鍵トラブル発生！知っておくべき車の鍵トラブル予防策とは？" },
			{ path: "/column/choose-oita-key-locksmith/", title: "【大分】車の鍵トラブル解決！信頼できる鍵屋選びとトラブル対処法" },
		],
	},
];

/** ブログの「ヒント」カテゴリ（記事は EmDash から新しい順に読む） */
export const hintGroup = {
	id: "hints",
	title: "現場からのヒント",
	lead: "ブログの「ヒント」の記事です。現場で出会った鍵の不具合や、おすすめの錠前を紹介しています。",
	category: "tips",
};
