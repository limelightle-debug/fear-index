#!/usr/bin/env python3
"""Archive the current issue of the paper (過去号).

Each issue (morning, evening or Sunday edition) is kept as data/archive/<id>.json together with a copy of every
data file the paper reads, as it was when the issue went out, so that a past issue opens with its own numbers.
Issues are kept for half a year (KEEP_DAYS): an older issue's snapshot, picture and thumbnail are removed and it
leaves the list. Long histories (more than 200 dated rows) keep only their last 30 rows; the page takes the older rows from the
series store data/archive/series/, which keeps every row ever seen (a data file that keeps only a window of years
drops its oldest rows; the store does not). data/archive/index.json lists the issues, newest first.

usage: archive.py <site root holding fear-index, mri-app, ndx-heatmap, tqqq> [--now ISO]
"""
import json, os, sys, datetime


# every data file the paper fetches, by its path from the site root (the page's fetch() resolves to the same path)
FILES = ["fear-index/data/paper.json", "fear-index/data/oas.json", "fear-index/data/interview.json", "fear-index/data/election.json",
         "ndx-heatmap/data/ndx.json", "tqqq/data/tqqq.json"] + [
         f"mri-app/data/{f}.json" for f in ("indices markets curve oas hyg rstar spx_daily liquidity macro fedwatch "
                                            "futures weekly weekend mri vix vix_daily money").split()]
LONG, KEEP = 200, 30


def is_series(v):
    return (isinstance(v, list) and len(v) > LONG and all(isinstance(r, list) and r and isinstance(r[0], (str, int, float)) for r in v)
            and all(type(v[i][0]) is type(v[i + 1][0]) and v[i][0] <= v[i + 1][0] for i in range(len(v) - 1)))


def tail(v, path="", found=None):
    """Long dated histories keep only their last rows in the issue; the older rows live in the series store
    (data/archive/series/), which keeps every row ever seen. found collects {path: rows} for that store."""
    if isinstance(v, dict):
        return {k: tail(x, f"{path}/{k}", found) for k, x in v.items()}
    if isinstance(v, list):
        if is_series(v):
            if found is not None:
                found[path] = v
            return {"__tail": v[-KEEP:], "__from": v[-KEEP][0]}
        return [tail(x, f"{path}/{i}", found) for i, x in enumerate(v)]
    return v


KEEP_DAYS = 183


def prune(d, idx, now):
    """Drop the issues that went out more than KEEP_DAYS ago: their snapshot, picture and thumbnail, and their row."""
    cut = now - datetime.timedelta(days=KEEP_DAYS)
    keep = []
    for r in idx["issues"]:
        if datetime.datetime.fromisoformat(r["at"]) >= cut:
            keep.append(r)
            continue
        for rel in (r["id"] + ".json", r.get("img"), r.get("thumb")):
            if rel and os.path.exists(os.path.join(d, rel)):
                os.remove(os.path.join(d, rel))
        print(f"removed {r['id']} (older than {KEEP_DAYS} days)")
    idx["issues"] = keep


def keep_series(d, name, found):
    """data/archive/series/<file>.json: {path: rows}, the union of every row seen (the newest value for a date wins),
    so a past issue's charts keep their older rows even after the data file drops them from its window."""
    if not found:
        return
    sd = os.path.join(d, "series")
    os.makedirs(sd, exist_ok=True)
    sp = os.path.join(sd, name.replace("/", "__"))
    store = json.load(open(sp, encoding="utf-8")) if os.path.exists(sp) else {}
    for path, rows in found.items():
        old = {json.dumps(r[0]): r for r in store.get(path, [])}
        old.update({json.dumps(r[0]): r for r in rows})
        store[path] = sorted(old.values(), key=lambda r: r[0])
    with open(sp, "w", encoding="utf-8") as fh:
        json.dump(store, fh, ensure_ascii=False, separators=(",", ":"))


def edition(p):
    """The edition the app shows for this paper.json, and when it went out: the newest of the morning (revised)
    article, the evening edition (preAt) and the Sunday edition (sunAt), as the page reads it (a sunAt or preAt
    left over from an earlier edition does not count)."""
    def T(v):
        return datetime.datetime.fromisoformat(v) if v else None
    w = p.get("revisedAt") or p.get("writtenAt")
    c = [(T(v), ed, v) for ed, v in (("mor", w), ("eve", p.get("preAt")), ("sun", p.get("sunAt"))) if v]
    if not c:
        return "mor", None
    _, ed, at = max(c, key=lambda x: x[0])
    return ed, at


def main(ROOT, NOW=None):
    FI = os.path.join(ROOT, "fear-index")
    paper = json.load(open(os.path.join(FI, "data/paper.json"), encoding="utf-8"))
    ed, at = edition(paper)
    if not at:
        print("no issue time; nothing archived")
        return
    t = datetime.datetime.fromisoformat(at).astimezone(datetime.timezone(datetime.timedelta(hours=9)))
    iid = f"{t:%Y-%m-%d}-{ed}"
    files = {}
    d = os.path.join(FI, "data/archive")
    os.makedirs(d, exist_ok=True)
    for f in FILES:
        path = os.path.join(ROOT, f)
        if os.path.exists(path):
            try:
                found = {}
                files[f] = tail(json.load(open(path, encoding="utf-8")), "", found)
                keep_series(d, f, found)
            except ValueError:
                pass
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
    prune(d, idx, datetime.datetime.fromisoformat(NOW) if NOW else datetime.datetime.now(datetime.timezone.utc))
    with open(ip, "w", encoding="utf-8") as fh:
        json.dump(idx, fh, ensure_ascii=False, separators=(",", ":"))
    print(f"archived {iid} ({os.path.getsize(os.path.join(d, iid + '.json')) // 1024} KB)")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[sys.argv.index("--now") + 1] if "--now" in sys.argv else None)
