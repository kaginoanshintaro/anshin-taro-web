/**
 * 店の基本情報。今の WordPress（2026-10-19 のエクスポート）の
 * トップページ・会社概要・メニューから写したもの。
 */
export const site = {
	name: "カギの安心太郎株式会社",
	shortName: "カギの安心太郎",
	tagline: "大分の一人社長の鍵屋さん",
	tel: { label: "097-560-0687", href: "tel:0975600687" },
	address: "〒870-1177 大分県大分市富士見が丘西1-3-1第一グリーンプラザビル東側簡易店舗",
	business: "鍵の解錠および修理交換、鍵と防犯機器の販売、取付、合鍵作成",
	areas:
		"大分市・別府市・速水郡・玖珠郡・中津市・日田市・佐伯市・臼杵市・津久見市・竹田市・豊後高田市・杵築市・宇佐市・豊後大野市・由布市・国東市・熊本県一部地域（小国町・南小国町・産山村・阿蘇市・高森町）",
};

/** 今の「グロナビ」メニューの上の階層（並び順もそのまま） */
export const globalNav = [
	{ label: "HOME", href: "/" },
	{ label: "サービス料金", href: "/price/" },
	{ label: "施工事例", href: "/examples/" },
	{ label: "お役立ち", href: "/tipshints/" },
	{ label: "会社概要・アクセス", href: "/profile/" },
	{ label: "お問い合わせ", href: "/contact/" },
];

export const footerNav = [
	{ label: "会社概要・アクセス", href: "/profile/" },
	{ label: "お問い合わせ", href: "/contact/" },
	{ label: "プライバシーポリシー", href: "/privacy-policy/" },
	{ label: "利用規約", href: "/terms/" },
	{ label: "リンク集", href: "/link/" },
];
