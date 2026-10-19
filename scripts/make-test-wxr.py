# urls/ の一覧から WordPress WXR 1.2 形式のテストデータを作る（本文はダミー、画像なし）
#   python3 scripts/make-test-wxr.py > test.wxr.xml
import os, sys, urllib.parse
from xml.sax.saxutils import escape
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "urls") + "/"
pages = [l.strip() for l in open(D+"urls-pages.txt") if l.strip().startswith("/")]
posts = [l.strip() for l in open(D+"urls-posts.txt") if l.strip().startswith("/")]
cats = [l.strip().split("/")[2] for l in open(D+"urls-archives.txt") if l.startswith("/category/")]
items = []; nid = 100; ids = {}

def item(title, name, ptype, parent=0, cat=None, date="2025-01-01 09:00:00"):
    global nid; nid += 1
    c = f'<category domain="category" nicename="{cat}"><![CDATA[{cat}]]></category>' if cat else ""
    items.append(f"""<item><title><![CDATA[{title}]]></title><link>https://kagino-anshin-taro.com/{name}/</link>
<dc:creator><![CDATA[anshin-taro]]></dc:creator><guid isPermaLink="false">https://kagino-anshin-taro.com/?p={nid}</guid>
<content:encoded><![CDATA[<!-- wp:paragraph --><p>テスト本文: {escape(title)}</p><!-- /wp:paragraph -->]]></content:encoded><excerpt:encoded><![CDATA[]]></excerpt:encoded>
<wp:post_id>{nid}</wp:post_id><wp:post_date><![CDATA[{date}]]></wp:post_date><wp:post_date_gmt><![CDATA[{date}]]></wp:post_date_gmt>
<wp:post_name><![CDATA[{name}]]></wp:post_name><wp:status><![CDATA[publish]]></wp:status><wp:post_parent>{parent}</wp:post_parent>
<wp:post_type><![CDATA[{ptype}]]></wp:post_type>{c}</item>""")
    return nid
for u in pages:
    if u == "/": continue
    segs = u.strip("/").split("/")
    parent = ids.get(segs[0], 0) if len(segs) > 1 else 0
    ids[segs[-1]] = item(urllib.parse.unquote(segs[-1]), segs[-1], "page", parent)
for i, u in enumerate(posts):
    s = u.strip("/")
    item(urllib.parse.unquote(s), s, "post", 0, cats[i % len(cats)], f"2025-{(i%12)+1:02d}-01 09:00:00")
catxml = "".join(f"<wp:category><wp:term_id>{i+1}</wp:term_id><wp:category_nicename><![CDATA[{c}]]></wp:category_nicename><wp:category_parent><![CDATA[]]></wp:category_parent><wp:cat_name><![CDATA[{c}]]></wp:cat_name></wp:category>" for i, c in enumerate(cats))
print(f"""<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:wfw="http://wellformedweb.org/CommentAPI/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:wp="http://wordpress.org/export/1.2/">
<channel><title>カギの安心太郎（テスト）</title><link>https://kagino-anshin-taro.com</link><language>ja</language><wp:wxr_version>1.2</wp:wxr_version>
<wp:base_site_url>https://kagino-anshin-taro.com</wp:base_site_url><wp:base_blog_url>https://kagino-anshin-taro.com</wp:base_blog_url>
<wp:author><wp:author_id>1</wp:author_id><wp:author_login><![CDATA[anshin-taro]]></wp:author_login><wp:author_email><![CDATA[test@example.com]]></wp:author_email><wp:author_display_name><![CDATA[安心太郎]]></wp:author_display_name></wp:author>
{catxml}
{"".join(items)}
</channel></rss>""")
