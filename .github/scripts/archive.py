#!/usr/bin/env python3
"""Archive the current issue of the paper (過去号).

Each issue (morning, evening or Sunday edition) is kept as data/archive/<id>.json together with a copy of every
data file the paper reads, as it was when the issue went out, so that a past issue opens with its own numbers.
Long histories (more than 200 dated rows) keep only their last 30 rows; the page takes the older rows from the
current file, which only ever grows at the end. data/archive/index.json lists the issues, newest first.

usage: archive.py <site root holding fear-index, mri-app, ndx-heatmap, tqqq> [--now ISO]
"""
import json, os, sys, datetime

ROOT = sys.argv[1]
NOW = sys.argv[sys.argv.index("--now") + 1] if "--now" in sys.argv else None
FI = os.path.join(ROOT, "fear-index")

# every data file the paper fetches, by its path from the site root (the page's fetch() resolves to the same path)
FILES = ["fear-index/data/paper.json", "fear-index/data/oas.json", "fear-index/data/interview.json",
         "ndx-heatmap/data/ndx.json", "tqqq/data/tqqq.json"] + [
         f"mri-app/data/{f}.json" for f in ("indices markets curve oas hyg rstar spx_daily liquidity macro fedwatch "
                                            "futures weekly weekend mri vix vix_daily").split()]
LONG, KEEP = 200, 30


def tail(v):
    """Long dated histories keep only their last rows; the page fills in the older rows from the current file."""
    if isinstance(v, dict):
        return {k: tail(x) for k, x in v.items()}
    if isinstance(v, list):
        if (len(v) > LONG and all(isinstance(r, list) and r and isinstance(r[0], (str, int, float)) for r in v)
                and all(type(v[i][0]) is type(v[i + 1][0]) and v[i][0] <= v[i + 1][0] for i in range(len(v) - 1))):
            return {"__tail": v[-KEEP:], "__from": v[-KEEP][0]}
        return [tail(x) for x in v]
    return v


def edition(p):
    """The edition the app shows for this paper.json, and when it went out."""
    w = p.get("revisedAt") or p.get("writtenAt")
    if p.get("sunAt"):
        return "sun", p["sunAt"]
    if p.get("preAt") and (not w or p["preAt"] > w):
        return "eve", p["preAt"]
    return "mor", w


def main():
    paper = json.load(open(os.path.join(FI, "data/paper.json"), encoding="utf-8"))
    ed, at = edition(paper)
    if not at:
        print("no issue time; nothing archived")
        return
    t = datetime.datetime.fromisoformat(at).astimezone(datetime.timezone(datetime.timedelta(hours=9)))
    iid = f"{t:%Y-%m-%d}-{ed}"
    files = {}
    for f in FILES:
        path = os.path.join(ROOT, f)
        if os.path.exists(path):
            try:
                files[f] = tail(json.load(open(path, encoding="utf-8")))
            except ValueError:
                pass
    d = os.path.join(FI, "data/archive")
    os.makedirs(d, exist_ok=True)
    snap = {"id": iid, "ed": ed, "at": at, "savedAt": NOW or datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
            "files": files}
    with open(os.path.join(d, iid + ".json"), "w", encoding="utf-8") as fh:
        json.dump(snap, fh, ensure_ascii=False, separators=(",", ":"))
    # the list: the edition's own headline and points
    head = {"sun": "sunHead", "eve": "futHead", "mor": "headline"}[ed]
    pts = {"sun": "sunPoints"}.get(ed, "points")
    row = {"id": iid, "ed": ed, "at": at, "head": paper.get(head) or paper.get("headline") or [], "points": (paper.get(pts) or [])[:5]}
    ip = os.path.join(d, "index.json")
    idx = json.load(open(ip, encoding="utf-8")) if os.path.exists(ip) else {"issues": []}
    idx["issues"] = sorted([r for r in idx["issues"] if r["id"] != iid] + [row], key=lambda r: r["at"], reverse=True)
    with open(ip, "w", encoding="utf-8") as fh:
        json.dump(idx, fh, ensure_ascii=False, separators=(",", ":"))
    print(f"archived {iid} ({os.path.getsize(os.path.join(d, iid + '.json')) // 1024} KB)")


main()
