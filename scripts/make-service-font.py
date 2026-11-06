#!/usr/bin/env python3
"""
サービス紹介の3ページ（/lock-opening/ /repair/ /duplicate/）の見出しだけに使う、しっぽり明朝（太字）の小さいフォントを作る。
見出しに出てくる文字だけを Google Fonts から取り出して public/fonts/service-headings.woff2 に置く。
見出しの文字を変えたら（src/data/services.ts の title や ServicePage.astro の見出し）、これを実行し直す。
  python3 scripts/make-service-font.py
"""
import re
import urllib.parse
import urllib.request
from pathlib import Path

root = Path(__file__).resolve().parent.parent
data = (root / "src/data/services.ts").read_text(encoding="utf-8")
page = (root / "src/components/ServicePage.astro").read_text(encoding="utf-8")
texts = re.findall(r'title: "([^"]+)"', data) + re.findall(r"<h[1-3][^>]*>([^<{]+)<", page) + re.findall(r'class="pp-toc-title">([^<]+)<', page)
chars = "".join(sorted(set("".join(texts))))

ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
css_url = "https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@700&text=" + urllib.parse.quote(chars)
css = urllib.request.urlopen(urllib.request.Request(css_url, headers={"User-Agent": ua})).read().decode()
font_url = re.search(r"url\((https://[^)]+)\) format\('woff2'\)", css).group(1)
font = urllib.request.urlopen(urllib.request.Request(font_url, headers={"User-Agent": ua})).read()
out = root / "public/fonts/service-headings.woff2"
out.write_bytes(font)
print(f"{len(chars)} 文字 → {out.relative_to(root)}（{len(font) // 1024} KB）")
