/**
 * WordPress から取り込んだ本文の画像のうち、こちらに移したもの（WordPress の画像番号 → 置き場所）。
 * 取り込みで画像の URL が無くなり番号だけ残ったもの（/_emdash/api/media/file/<番号> で出ない）を、
 * 本番の同じ画像から幅960px（縦長は高さ720px）の WebP にして public/images/tips/articles/ に置いた。
 * url は本番の元の画像（同じ画像が URL で入っている場合にも、こちらを使う）。
 */
export const wpMedia: Record<string, { src: string; width: number; height: number; url: string }> = {
	"1962": { src: "/images/tips/articles/wp-1962.webp", width: 483, height: 720, url: "https://kagino-anshin-taro.com/wp-content/uploads/2025/12/安心太郎ちゃん先生-687x1024.jpg" },
	"1865": { src: "/images/tips/articles/wp-1865.webp", width: 960, height: 540, url: "https://kagino-anshin-taro.com/wp-content/uploads/2025/10/DSC09861-Edit.png" },
	"1958": { src: "/images/tips/articles/wp-1958.webp", width: 960, height: 524, url: "https://kagino-anshin-taro.com/wp-content/uploads/2025/12/Lever_handle-1024x559.jpg" },
	"1953": { src: "/images/tips/articles/wp-1953.webp", width: 960, height: 540, url: "https://kagino-anshin-taro.com/wp-content/uploads/2025/12/スイッチ式防犯サムターン-1024x576.png" },
	"1954": { src: "/images/tips/articles/wp-1954.webp", width: 960, height: 912, url: "https://kagino-anshin-taro.com/wp-content/uploads/2025/12/スクリーンショット-2025-12-15-19.30.51-1024x973.png" },
	"1955": { src: "/images/tips/articles/wp-1955.webp", width: 960, height: 717, url: "https://kagino-anshin-taro.com/wp-content/uploads/2025/12/鎌デッド.png" },
	"1956": { src: "/images/tips/articles/wp-1956.webp", width: 960, height: 717, url: "https://kagino-anshin-taro.com/wp-content/uploads/2025/12/ラッチボルト.png" },
	"1960": { src: "/images/tips/articles/wp-1960.webp", width: 960, height: 900, url: "https://kagino-anshin-taro.com/wp-content/uploads/2025/12/GOAL-PY-1024x960.jpg" },
	"1961": { src: "/images/tips/articles/wp-1961.webp", width: 960, height: 524, url: "https://kagino-anshin-taro.com/wp-content/uploads/2025/12/ストライク-1024x559.jpg" },
	"1950": { src: "/images/tips/articles/wp-1950.webp", width: 483, height: 720, url: "https://kagino-anshin-taro.com/wp-content/uploads/2025/12/サムズアップ-687x1024.png" },
};

const byUrl = new Map(Object.values(wpMedia).map((m) => [m.url, m]));
/** 画像の番号か本番の URL から、移した画像を引く */
export const findWpMedia = (ref?: string, url?: string) =>
	(ref && wpMedia[ref]) || (url ? byUrl.get(url.replace(/^http:/, "https:")) : undefined);
