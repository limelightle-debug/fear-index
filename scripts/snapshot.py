"""過去号 as a picture: a past issue (index.html?issue=<id>, opened with the data it went out with) captured at phone
width with the buttons and span pickers hidden and the interview opened, in slices stitched into one picture,
data/archive/img/<id>.jpg; its row in data/archive/index.json gets "img", "w" and "hgt". The page shows the picture
in place of the live issue once it exists, so a past issue stays as it looked, whatever the code becomes later.
usage: python fear-index/scripts/snapshot.py ROOT [ID ...]   (ROOT holds the checkouts; no ID: the newest issue)
"""
import json
import os
import sys
import threading
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
FI = ROOT / "fear-index"
W, DPR, SLICE = 390, 2, 2400
HIDE = """
.top,#guide,.foot,.rpseg,.rtog button[aria-pressed="false"],details>summary.more{display:none!important}
.rtog button{pointer-events:none}
*{animation:none!important;transition:none!important;caret-color:transparent}
"""


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve():
    h = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(ROOT)))
    threading.Thread(target=h.serve_forever, daemon=True).start()
    return h


def local_fonts(page):
    # in a sandbox without Google Fonts: LOCALFONTS points at a node_modules with the Fontsource copies
    nm = os.environ.get("LOCALFONTS")
    if not nm:
        return
    nm = Path(nm)

    def css(pkg, files, rename=None):
        out = []
        for f in files:
            t = (nm / pkg / f).read_text().replace("url(./files/", f"url(https://localfont.test/{pkg}/files/")
            if rename:
                import re
                t = re.sub(r"font-family: '[^']+'", f"font-family: '{rename}'", t)
            out.append(t)
        return "\n".join(out)
    body = (css("@fontsource/line-seed-jp", ["400.css", "700.css", "800.css"])
            + css("@fontsource-variable/archivo", ["wdth.css"], "Archivo") + css("@fontsource/shippori-mincho-b1", ["800.css"]))
    page.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(content_type="text/css", body=body))
    page.route("https://localfont.test/**", lambda r: r.fulfill(
        body=(nm / r.request.url.split("localfont.test/", 1)[1]).read_bytes(), headers={"access-control-allow-origin": "*"}))


def shoot(page, url):
    page.goto(url, wait_until="networkidle")
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(2500)
    page.add_style_tag(content=HIDE)
    page.evaluate("document.querySelectorAll('#intv details:not(.past)').forEach(d=>d.open=true)")
    page.wait_for_timeout(500)
    H = page.evaluate("Math.ceil(document.documentElement.scrollHeight)")
    img = Image.new("RGB", (W * DPR, H * DPR))
    y = 0
    while y < H:
        h = min(SLICE, H - y)
        png = page.screenshot(clip={"x": 0, "y": y, "width": W, "height": h}, full_page=True)
        img.paste(Image.open(BytesIO(png)).convert("RGB"), (0, y * DPR))
        y += h
    return img


def main(ids):
    ix = FI / "data/archive/index.json"
    idx = json.loads(ix.read_text())
    ids = ids or [idx["issues"][0]["id"]]
    srv = serve()
    base = f"http://127.0.0.1:{srv.server_address[1]}/fear-index/"
    with sync_playwright() as p:
        b = p.chromium.launch()
        for iid in ids:
            ctx = b.new_context(viewport={"width": W, "height": 844}, device_scale_factor=DPR, service_workers="block",
                                locale="ja-JP", timezone_id="Asia/Tokyo")
            page = ctx.new_page()
            local_fonts(page)
            img = shoot(page, f"{base}?issue={iid}&shot=1")
            ctx.close()
            rel = f"data/archive/img/{iid}.jpg"
            (FI / rel).parent.mkdir(parents=True, exist_ok=True)
            img.save(FI / rel, "JPEG", quality=72, optimize=True, progressive=True)
            for r in idx["issues"]:
                if r["id"] == iid:
                    r.update(img=rel.replace("data/archive/", ""), w=img.width, hgt=img.height)
            print(rel, img.size, round((FI / rel).stat().st_size / 1024), "KB")
        b.close()
    srv.shutdown()
    ix.write_text(json.dumps(idx, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    main(sys.argv[2:])
