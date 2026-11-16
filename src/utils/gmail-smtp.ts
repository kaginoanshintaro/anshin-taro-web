// Gmail の SMTP（smtp.gmail.com:465、TLS）で 1 通送る小さな送信処理。
// 会社の Gmail のアプリパスワードで送る。ドメインの DNS（ConoHa）を変えずに送れる方法として選んだ（2026-11-16）。
import { connect } from "cloudflare:sockets";

export interface MailInput {
	user: string; // Gmail のアドレス（差出人にもなる）
	password: string; // アプリパスワード（Cloudflare のシークレット）
	to: string;
	fromName: string;
	replyTo?: string;
	subject: string;
	text: string;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

const b64 = (s: string) => {
	let bin = "";
	for (const b of enc.encode(s)) bin += String.fromCharCode(b);
	return btoa(bin);
};
const encodedWord = (s: string) => `=?UTF-8?B?${b64(s.replace(/[\r\n]+/g, " "))}?=`;
const wrap76 = (s: string) => s.replace(/.{1,76}/g, "$&\r\n");

function buildMessage(m: MailInput) {
	const headers = [
		`From: ${encodedWord(m.fromName)} <${m.user}>`,
		`To: <${m.to}>`,
		...(m.replyTo ? [`Reply-To: <${m.replyTo}>`] : []),
		`Subject: ${encodedWord(m.subject)}`,
		`Date: ${new Date().toUTCString().replace("GMT", "+0000")}`,
		`Message-ID: <${crypto.randomUUID()}@anshin-taro-web>`,
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"Content-Transfer-Encoding: base64",
	];
	return headers.join("\r\n") + "\r\n\r\n" + wrap76(b64(m.text.replace(/\r?\n/g, "\r\n")));
}

export async function sendGmail(m: MailInput, timeoutMs = 15000): Promise<void> {
	const socket = connect({ hostname: "smtp.gmail.com", port: 465 }, { secureTransport: "on", allowHalfOpen: false });
	const writer = socket.writable.getWriter();
	const reader = socket.readable.getReader();
	let buf = "";

	// 1 つの応答（複数行なら最後の「NNN 」行まで）を読む
	const readReply = async (): Promise<{ code: number; text: string }> => {
		for (;;) {
			const lines = buf.split("\r\n");
			for (let i = 0; i < lines.length - 1; i++) {
				if (/^\d{3} /.test(lines[i]) || /^\d{3}$/.test(lines[i])) {
					const text = lines.slice(0, i + 1).join("\n");
					buf = lines.slice(i + 1).join("\r\n");
					return { code: Number(lines[i].slice(0, 3)), text };
				}
			}
			const { value, done } = await reader.read();
			if (done) throw new Error("SMTP connection closed");
			buf += dec.decode(value, { stream: true });
		}
	};
	const expect = async (code: number, step: string) => {
		const r = await readReply();
		if (r.code !== code) throw new Error(`SMTP ${step}: ${r.text}`);
	};
	const send = (line: string) => writer.write(enc.encode(line + "\r\n"));

	const run = async () => {
		await expect(220, "greeting");
		await send("EHLO anshin-taro-web");
		await expect(250, "EHLO");
		await send("AUTH PLAIN " + b64(`\0${m.user}\0${m.password}`));
		await expect(235, "AUTH");
		await send(`MAIL FROM:<${m.user}>`);
		await expect(250, "MAIL FROM");
		await send(`RCPT TO:<${m.to}>`);
		await expect(250, "RCPT TO");
		await send("DATA");
		await expect(354, "DATA");
		// 行頭の「.」は 2 つにする（本文は base64 なので通常は起きない）
		await send(buildMessage(m).replace(/\r\n\./g, "\r\n..") + "\r\n.");
		await expect(250, "message");
		await send("QUIT").catch(() => {});
	};

	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		await Promise.race([
			run(),
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => reject(new Error("SMTP timeout")), timeoutMs);
			}),
		]);
	} finally {
		clearTimeout(timer);
		await socket.close().catch(() => {});
	}
}
