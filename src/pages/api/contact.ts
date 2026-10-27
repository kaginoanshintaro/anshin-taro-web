// お問い合わせフォームの受け口（/api/contact/）。
// 入力の確認と迷惑送信よけ（見えない欄・Turnstile）までをここで行う。
// メールを送る方法（宛先 kagino.anshin.taro@gmail.com、差出人 wordpress@kagino-anshin-taro.com のまま）は
// 佐藤さんの確認待ち。決まるまでは送らずに「準備中」を返す。
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

const LIMITS = { name: 400, email: 400, subject: 400, message: 2000 };
const NOT_SENT = "送信できませんでした。お手数ですがお電話にてお問い合わせください。";

const reply = (status: number, message: string) =>
	new Response(JSON.stringify({ ok: status === 200, message }), {
		status,
		headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
	});

export const POST: APIRoute = async ({ request, cache }) => {
	cache?.set(false);
	const form = await request.formData().catch(() => null);
	if (!form) return reply(400, NOT_SENT);

	const field = (key: keyof typeof LIMITS) => String(form.get(key) ?? "").trim();
	const data = { name: field("name"), email: field("email"), subject: field("subject"), message: field("message") };

	// 見えない欄に入力があるのは機械による送信。受け付けたふりをして捨てる
	if (String(form.get("website") ?? "") !== "") return reply(200, "送信しました。");

	if (!data.name || !data.email || !data.subject) return reply(400, "入力されていない項目があります。");
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return reply(400, "メールアドレスの形が正しくありません。");
	for (const key of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
		if (data[key].length > LIMITS[key]) return reply(400, "入力が長すぎます。");
	}

	const vars = env as unknown as Record<string, string | undefined>;
	if (vars.TURNSTILE_SECRET_KEY) {
		const ok = await verifyTurnstile(vars.TURNSTILE_SECRET_KEY, String(form.get("cf-turnstile-response") ?? ""), request.headers.get("CF-Connecting-IP"));
		if (!ok) return reply(400, "確認が取れませんでした。ページを開き直してもう一度お試しください。");
	}

	// TODO: 送信方法が決まったらここでメールを送る（宛先・差出人は上のとおり）
	return reply(503, "テスト用のページのため、まだ送信されません。お急ぎの方はお電話ください。");
};

async function verifyTurnstile(secret: string, token: string, ip: string | null) {
	if (!token) return false;
	const body = new FormData();
	body.append("secret", secret);
	body.append("response", token);
	if (ip) body.append("remoteip", ip);
	const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
	const result = (await res.json().catch(() => ({}))) as { success?: boolean };
	return result.success === true;
}
