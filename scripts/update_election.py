"""号外: the seat counts from NBC News's results pages (its own race calls), every few minutes on the runner.

Only house/senate D, I, R and asof change; the headline, story and races stay as the 号外 task wrote them.
NBC counts the independents who caucus with the Democrats as Democratic seats, so the Senate I already in
the file is taken out of NBC's Democratic total. Stops once the 号外 is off, more than 30 hours old, or the morning paper for untilPaper is out.
"""
import datetime, json, re, sys, time, urllib.request

P = "data/election.json"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
JST = datetime.timezone(datetime.timedelta(hours=9))


def page(u):
    req = urllib.request.Request(u, headers={"User-Agent": UA, "Accept-Language": "en-US"})
    return urllib.request.urlopen(req, timeout=40).read().decode("utf-8", "replace")


def bop():
    h = page("https://www.nbcnews.com/politics/2026-elections/house-results")
    m = re.search(r'"seatsByParty":\{"dem":(\d+),"rep":(\d+),"uncalled":(\d+)\}', h)
    s = re.search(r'"S":\{"officeCode":"S".*?"dem":\{[^{}]*?"total":(\d+)[^{}]*\},"rep":\{[^{}]*?"total":(\d+)', h, re.S)
    if not s:
        s = re.search(r'"S":\{"officeCode":"S".*?"dem":\{[^{}]*?"total":(\d+)[^{}]*\},"rep":\{[^{}]*?"total":(\d+)',
                      page("https://www.nbcnews.com/politics/2026-elections/senate-results"), re.S)
    if not m or not s:
        return None
    hd, hr, hu = map(int, m.groups())
    sd, sr = map(int, s.groups())
    if not (0 < hd + hr <= 435 and 0 < sd + sr <= 100):
        return None
    return hd, hr, hu, sd, sr


def once():
    d = json.load(open(P, encoding="utf-8"))
    paper = json.load(open("data/paper.json", encoding="utf-8"))
    if d.get("untilPaper") and paper.get("date", "") >= d["untilPaper"]:
        return "off"
    if not d.get("active") or datetime.datetime.now(JST) - datetime.datetime.fromisoformat(d["asof"]) > datetime.timedelta(hours=30):
        return "off"
    b = bop()
    if not b:
        print("no NBC numbers"); return "skip"
    hd, hr, hu, sd, sr = b
    H, S = d["house"], d["senate"]
    si = int(S.get("I") or 0)
    new = {"house": {"D": hd - int(H.get("I") or 0), "R": hr}, "senate": {"D": sd - si, "R": sr}}
    # counts only grow once a race is called: a smaller number is a page glitch, not news
    if hd < H.get("D", 0) + H.get("I", 0) or (H.get("R") or 0) > hr or sd < S.get("D", 0) + si or (S.get("R") or 0) > sr:
        print("smaller than before, kept", b); return "skip"
    now = datetime.datetime.now(JST).replace(second=0, microsecond=0)
    if all(d[c][k] == v for c in new for k, v in new[c].items()):
        # unchanged: the time on the page is the last check (every 10 minutes), so the reader sees the count is current
        if now - datetime.datetime.fromisoformat(d["asof"]) < datetime.timedelta(minutes=10):
            print("no change", b); return "same"
        d["asof"] = now.isoformat(); d.pop("checkedAt", None)
        json.dump(d, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print("no change, time updated", b); return "new"
    for c in new:
        d[c].update(new[c]); d[c].pop("Dl", None); d[c].pop("Rl", None)
    d["source"] = "NBCニュース（各選挙区の当確判定）"
    d["uncalled"] = {"house": hu, "senate": 100 - sd - sr}
    d["asof"] = now.isoformat()
    json.dump(d, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("updated", b); return "new"


if __name__ == "__main__":
    loops = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    import subprocess as sp
    for i in range(loops):
        sp.run("git pull -q --rebase", shell=True)
        try:
            r = once()
        except Exception as e:
            print("error", e); r = "skip"
        if r == "off":
            sys.exit(3)  # the 号外 is over: no hand-over
        if r == "new":
            sp.run('git add data/election.json && git commit -qm "Gogai: seats from NBC" && (git push -q origin main || (git pull -q --rebase && git push -q origin main))', shell=True)
        if i < loops - 1:
            time.sleep(300)
