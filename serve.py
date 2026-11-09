"""Serves dist/ for trying COTEXT locally: python3 serve.py [port]  (default 8090, this machine only).

The beta: python3 serve.py 8091 beta  serves beta/ (gitignored), a frozen copy of a build - beta.cotext.org, public,
through the tunnel; python3 serve.py --publish  copies dist/ there (the one way the beta changes), less the resources
beta-exclude.txt lists.

Python's own server, with .wasm served as application/wasm (SQLite's WebAssembly build needs it) and nothing
kept by the browser or Cloudflare, so a rebuild shows on reload. (The service worker still keeps its own copy: a new build's
worker takes over on the next load.)
"""
import functools
import http.server
import pathlib
import sys

HERE = pathlib.Path(__file__).parent
if sys.argv[1:] == ["--publish"]:     # (dist/ copied over beta/, replacing it whole)
    import hashlib
    import re
    import shutil
    import sqlite3
    shutil.rmtree(HERE / "beta", ignore_errors=True)
    shutil.copytree(HERE / "dist", HERE / "beta")
    # The resources kept out of the beta (beta-exclude.txt: a note_sources id a line, # a comment): their rows taken
    # from the beta's core.db and their files deleted; core's new version and size (build.mjs' hash: the first 12 hex
    # of its SHA-256) written into the beta's app.js in place of dev's, so devices fetch the beta's own core.
    out = [ln.split("#")[0].strip() for ln in (HERE / "beta-exclude.txt").read_text().splitlines()]
    out = [x for x in out if x]
    # The screens kept out of the beta ("screen: NAME" lines): their ☰ button (data-screen="NAME") taken from the beta's
    # index.html - the only way in - and the beta's service worker given its own shell hash, so devices fetch that page.
    screens = [x.split(":", 1)[1].strip() for x in out if x.startswith("screen:")]
    out = [x for x in out if not x.startswith("screen:")]
    if screens:
        page = HERE / "beta" / "index.html"
        html = page.read_text()
        for name in screens:
            html, n = re.subn(r'[ \t]*<button[^>]*data-screen="' + re.escape(name) + r'"[^>]*>.*?</button>\n?', "", html)
            if n != 1:
                sys.exit(f"beta: the ☰ button for {name} not found in index.html - not published right")
        page.write_text(html)
        sw = HERE / "beta" / "sw.js"
        js, n = re.subn(r'"cotext-shell-([0-9a-f]+)"', lambda m: f'"cotext-shell-{m.group(1)}-{hashlib.sha256(html.encode()).hexdigest()[:8]}"', sw.read_text())
        if n != 1:
            sys.exit("beta: the shell's name not found in sw.js - not published right")
        sw.write_text(js)
    core = HERE / "beta" / "data" / "db" / "core.db"
    if out:
        old_ver = hashlib.sha256(core.read_bytes()).hexdigest()[:12]
        db = sqlite3.connect(core)
        for sid, file in db.execute(f"SELECT id, file FROM note_sources WHERE id IN ({','.join('?' * len(out))})", out).fetchall():
            (HERE / "beta" / file).unlink(missing_ok=True)
        db.execute(f"DELETE FROM note_sources WHERE id IN ({','.join('?' * len(out))})", out)
        db.commit()
        db.execute("VACUUM")
        db.close()
        data = core.read_bytes()
        app = HERE / "beta" / "app.js"
        js, n = re.subn(r'part:"core",version:"' + old_ver + r'",bytes:\d+',
                        f'part:"core",version:"{hashlib.sha256(data).hexdigest()[:12]}",bytes:{len(data)}', app.read_text())
        if n != 1:
            sys.exit("beta: core's version not found in app.js - not published right; run the publish again after a build")
        app.write_text(js)
    print("COTEXT beta published from dist/" + (f" (without {', '.join(out + screens)})" if out or screens else ""))
    sys.exit()
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8090
DIST = HERE / (sys.argv[2] if len(sys.argv) > 2 else "dist")     # (The folder served: dist/, or beta/ for the beta)


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".wasm": "application/wasm",
                      ".mjs": "text/javascript", ".js": "text/javascript", ".webmanifest": "application/manifest+json"}

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")     # (Nothing kept on the way: not by the browser, not by Cloudflare)
        super().end_headers()


if __name__ == "__main__":
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(Handler, directory=str(DIST)))
    print(f"COTEXT at http://127.0.0.1:{PORT}/")
    server.serve_forever()
