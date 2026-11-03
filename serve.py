"""Serves dist/ for trying COTEXT locally: python3 serve.py [port]  (default 8090, this machine only).

The beta: python3 serve.py 8091 beta  serves beta/ (gitignored), a frozen copy of a build - beta.cotext.org, public,
through the tunnel; python3 serve.py --publish  copies dist/ there (the one way the beta changes).

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
    import shutil
    shutil.rmtree(HERE / "beta", ignore_errors=True)
    shutil.copytree(HERE / "dist", HERE / "beta")
    print("COTEXT beta published from dist/")
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
