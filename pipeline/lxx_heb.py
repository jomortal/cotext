"""The Septuagint's verses on the Hebrew Bible's: for each LXX verse (books 67 on whose `heb` is a Hebrew book), the
Hebrew verse or verses it translates - the notes panel's "Hebrew OT" beside an LXX book (src/hebrew.ts). The two
number and order much of the OT otherwise (the Psalms one off and their titles a verse of their own, Jeremiah 25-51 in
another order, Exodus 35-40, 3 Kingdoms, Proverbs 24-31, Esther's and Daniel's additions), so the map is made from the
words themselves, not from a table of rules:

1. Which Greek lemma translates which Hebrew one, learned from the books numbered alike (lxx.py's notes_books: an LXX
   book whose notes are its Hebrew book's): each verse pair there counts its Hebrew and Greek lemmas together; a pair
   of lemmas is linked when it meets at least 3 times with a Dice coefficient of 0.1 or more (each Greek lemma keeps
   its 6 best). Names spelled Swete's way (keys GL...) are learned the same way. Beside them, the words' English
   glosses: a content word in both verses' glosses is a match too (the Aramaic's lemmas, keyed apart from the
   Hebrew's, are seldom learned: Daniel 2-7).
2. Each LXX verse scored against the Hebrew book's verses sharing a linked lemma: the F1 of the two sides' words
   matched, each word weighted by its rarity in the book (log of verses / verses with it).
3. One path through the book (Viterbi): each LXX verse a Hebrew verse, the sum of their scores highest less what
   its steps cost - on to the next Hebrew verse free, the same or one past 0.1, two past or one back 0.25, a jump
   anywhere else 0.5 - so the verses follow the Hebrew's order where they can and jump where the LXX reorders a
   block (Jeremiah's oracles on the nations, Exodus 36-39). A verse is matched where it scores 0.12 or more, or where
   the path runs straight through it (a list of names spelled too differently to match: Joshua's towns,
   Chronicles' families).
4. A Hebrew verse taken by LXX verses more than 5 apart stays with the one scoring best with it: the others are the
   LXX's own (the Prayer of Azariah, Daniel 3:24-90, otherwise read as Daniel 9's prayer).
5. Gaps filled: a Hebrew verse no LXX verse took, lying between the Hebrew verses of two consecutive LXX verses, joins the one it
   scores higher with (Psalm 9 holding the Hebrew 9 and 10) - a Psalm's title (verse 0) always the later, the LXX's
   verse 1 it's part of.

An LXX verse left with none is "Not in the Hebrew" (the panel says so). Table (the main database):
  lxx_heb (book, chapter, verse, hbook, hchapter, hverse) - an LXX verse and one Hebrew verse it matches, a row each.
Run alone it (re)builds the table in public/data/cotext.db; build_db.py calls build(db) after the LXX is added.
"""
import collections
import math
import pathlib
import re
import sqlite3

DB = pathlib.Path(__file__).parent.parent / "public" / "data" / "cotext.db"
MIN_PAIR, MIN_DICE, KEEP = 3, 0.1, 6
WEAK, JUMP = 0.12, 0.5
STEP = {1: 0.0, 0: 0.1, 2: 0.1, 3: 0.25, -1: 0.25}     # (Hebrew place minus the last's: its cost)


GLOSS_STOP = set("the and of to in a an he she it they we you i me my his her its our their them him us was were is be "
                 "not for with on at from by that this which who all as are have has had will shall do did so but or "
                 "then there what thing one".split())


def verses(db, book, glosses=False):
    """A book's verses in order: [((chapter, verse), set of lemma keys)] - with glosses, also each content word of the
    words' English glosses ("w:babylon"; a plural's s dropped), a word on both sides matching itself."""
    out = collections.OrderedDict()
    for c, v, s, g in db.execute("SELECT chapter, verse, strong, gloss FROM words WHERE book = ? ORDER BY chapter, verse, word",
                                 (book,)):
        keys = out.setdefault((c, v), set())
        keys.add(s)
        if glosses:
            for w in re.findall(r"[a-z]+", (g or "").lower()):
                if len(w) > 2 and w not in GLOSS_STOP:
                    keys.add("w:" + (w[:-1] if w.endswith("s") and len(w) > 3 else w))
    return list(out.items())


def learn(db, pairs):
    """{Greek lemma: {Hebrew lemma: Dice}} from the books numbered alike (pairs: [(lxx id, hebrew id)])."""
    ch, cg, chg = collections.Counter(), collections.Counter(), collections.Counter()
    for lb, hb in pairs:
        heb = dict(verses(db, hb))
        for ref, gs in verses(db, lb):
            hs = heb.get(ref)
            if not hs:
                continue
            ch.update(hs)
            cg.update(gs)
            chg.update((g, h) for g in gs for h in hs)
    links = collections.defaultdict(dict)
    for (g, h), n in chg.items():
        d = 2 * n / (cg[g] + ch[h])
        if n >= MIN_PAIR and d >= MIN_DICE:
            links[g][h] = d
    return {g: dict(sorted(hs.items(), key=lambda x: -x[1])[:KEEP]) for g, hs in links.items()}


def align(lxx, heb, links):
    """[(LXX index, [Hebrew indexes])] for one book: steps 2-5 of the docstring."""
    n_l, n_h = len(lxx), len(heb)
    idf_g = collections.Counter(g for _, gs in lxx for g in gs)
    idf_h = collections.Counter(h for _, hs in heb for h in hs)
    idf_g = {g: math.log((n_l + 1) / c) for g, c in idf_g.items()}
    idf_h = {h: math.log((n_h + 1) / c) for h, c in idf_h.items()}
    post = collections.defaultdict(list)
    for j, (_, hs) in enumerate(heb):
        for h in hs:
            post[h].append(j)
    wh = [sum(idf_h[h] for h in hs) for _, hs in heb]

    def linked(g):     # (A gloss word links to itself)
        return {g: 1.0} if g.startswith("w:") else links.get(g, {})

    def score(i, j):
        gs, hs = lxx[i][1], heb[j][1]
        mg = sum(idf_g[g] for g in gs if any(h in hs for h in linked(g)))
        mh = sum(idf_h[h] for h in hs if any(h in linked(g) for g in gs))
        wg = sum(idf_g[g] for g in gs)
        if not mg or not mh:
            return 0.0
        p, r = mg / wg, mh / wh[j]
        return 2 * p * r / (p + r)

    # The path: each LXX verse a Hebrew verse, the whole scoring highest - each verse's score, less what its step from
    # the last costs (STEP: on to the next is free; jumping anywhere else costs JUMP). Its states for a verse: the
    # rough pass's likeliest 40, and the same, the next and the one past of the last verse's 15 best (so a path runs on
    # through verses that match nothing: a list of names, a verse the LXX lacks).
    V, back, sims = [], [], []
    for i, (_, gs) in enumerate(lxx):
        rough = collections.Counter()
        for g in gs:
            for h, d in linked(g).items():
                if len(post[h]) > max(200, n_h // 5):     # (Too common to point anywhere: καί, the article, the LORD)
                    continue
                for j in post[h]:
                    rough[j] += idf_g[g] * d
        states = {j for j, _ in rough.most_common(40)}
        if V:
            for j, _ in sorted(V[-1].items(), key=lambda x: -x[1])[:15]:
                states.update(k for k in (j, j + 1, j + 2) if k < n_h)
        if not states:
            states = {0}
        sim = {j: score(i, j) for j in states}
        v, bk = {}, {}
        if V:
            prev = V[-1]
            top = max(prev, key=prev.get)
            for j in states:
                best_j, best = top, prev[top] - JUMP
                for d, cost in STEP.items():
                    if (j - d) in prev and prev[j - d] - cost > best:
                        best_j, best = j - d, prev[j - d] - cost
                v[j], bk[j] = best + sim[j], best_j
        else:
            v = dict(sim)
        V.append(v); back.append(bk); sims.append(sim)
    path = [max(V[-1], key=V[-1].get)] if V else []
    for i in range(n_l - 1, 0, -1):
        path.append(back[i][path[-1]])
    path.reverse()
    # A verse is matched where it scores WEAK or more, or where the path runs straight through it (the verses either
    # side the Hebrew verses either side of its own).
    pick = [j if sims[i][j] >= WEAK or (0 < i < n_l - 1 and path[i - 1] == j - 1 and path[i + 1] == j + 1) else None
            for i, j in enumerate(path)]
    # A Hebrew verse taken by LXX verses far apart (more than 5) stays only with the one it fits best: the others are
    # the LXX's own (the Prayer of Azariah, Daniel 3:24-90, read as Daniel 9's prayer; 3 Kingdoms' miscellanies).
    users = collections.defaultdict(list)
    for i, j in enumerate(pick):
        if j is not None:
            users[j].append(i)
    for j, its in users.items():
        if its[-1] - its[0] > 5:
            keep = max(its, key=lambda i: sims[i].get(j, 0.0))
            for i in its:
                if abs(i - keep) > 5:
                    pick[i] = None
    out = [[j] if j is not None else [] for j in pick]
    taken = {j for j in pick if j is not None}
    for i in range(n_l - 1):     # (A Hebrew verse left between two consecutive LXX verses' joins the likelier)
        a, b = pick[i], pick[i + 1]
        if a is None or b is None or not 1 < b - a <= 3:
            continue
        for j in range(a + 1, b):
            if j not in taken:     # (A title, verse 0, always with the psalm it heads)
                later = heb[j][0][1] == 0 or score(i + 1, j) > score(i, j)
                (out[i + 1] if later else out[i]).append(j)
                taken.add(j)
    if pick and pick[0] is not None and pick[0] > 0 and 0 < pick[0] <= 2:     # (Before the first: a title)
        for j in range(pick[0]):
            if j not in taken:
                out[0].append(j)
    return [(i, sorted(js)) for i, js in enumerate(out)]


def build(db):
    """(Re)makes the lxx_heb table from the words and books tables."""
    books = db.execute("SELECT id, heb, notes FROM books WHERE testament = 'LXX' AND heb > 0").fetchall()
    links = learn(db, [(b, h) for b, h, n in books if n == h])
    db.execute("DROP TABLE IF EXISTS lxx_heb")
    db.execute("CREATE TABLE lxx_heb (book INTEGER, chapter INTEGER, verse INTEGER, hbook INTEGER, hchapter INTEGER, "
               "hverse INTEGER)")
    rows, none = [], 0
    for b, h, _n in books:
        lxx, heb = verses(db, b, True), verses(db, h, True)
        for i, js in align(lxx, heb, links):
            (c, v) = lxx[i][0]
            none += not js
            rows += [(b, c, v, h, *heb[j][0]) for j in js]
    db.executemany("INSERT INTO lxx_heb VALUES (?,?,?,?,?,?)", rows)
    db.execute("CREATE INDEX lxx_heb_at ON lxx_heb (book, chapter, verse)")
    db.commit()
    return len(rows), none


if __name__ == "__main__":
    con = sqlite3.connect(DB)
    n, none = build(con)
    print(f"lxx_heb: {n} rows; {none} LXX verses not in the Hebrew")
    con.close()
