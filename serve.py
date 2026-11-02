"""Serves dist/ for trying COTEXT locally: python3 serve.py [port]  (default 8090, this machine only).

Python's own server, with .wasm served as application/wasm (SQLite's WebAssembly build needs it) and nothing
kept by the browser or Cloudflare, so a rebuild shows on reload. (The service worker still keeps its own copy: a new build's
worker takes over on the next load.)
"""
import functools
import http.server
import pathlib
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8090
DIST = pathlib.Path(__file__).parent / "dist"


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
