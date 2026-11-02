// Builds the app into dist/: public/ copied as it is, src/ bundled by esbuild into app.js, and the service worker
// given the app's file list and versions. Run: npm run build  (after python3 pipeline/build_db.py has made the database)
import * as esbuild from "esbuild";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DB = "public/data/cotext.db";
if (! fs.existsSync (DB)) {
  console.error (`${DB} is missing: run python3 pipeline/build_db.py first.`);
  process.exit (1);
}
const hash = (buf) => crypto.createHash ("sha256").update (buf).digest ("hex").slice (0, 12);

fs.rmSync ("dist", { recursive: true, force: true });
fs.cpSync ("public", "dist", { recursive: true });

await esbuild.build ({
  entryPoints: ["src/main.ts"], bundle: true, format: "esm", minify: true, sourcemap: true,
  target: ["safari15", "chrome100", "firefox100"], outfile: "dist/app.js",
  define: { DB_VERSION: JSON.stringify (hash (fs.readFileSync (DB))) },
});

// Every file but the database (cached on its own) and the source map, as the page asks for them.
const files = [];
const walk = (dir) => {
  for (const f of fs.readdirSync (dir, { withFileTypes: true })) {
    const p = path.join (dir, f.name);
    if (f.isDirectory ()) walk (p);
    else files.push (path.relative ("dist", p).split (path.sep).join ("/"));
  }
};
walk ("dist");
// The page asks for its script and styles by their content's hash (app.js?v=...): a browser or a cache on the way
// (Cloudflare's) can never hand back an old copy of one with a new page - each build's are new addresses.
{
  let html = fs.readFileSync ("dist/index.html", "utf8");
  for (const f of ["app.js", "style.css"])
    html = html.replace (`"${f}"`, `"${f}?v=${hash (fs.readFileSync (path.join ("dist", f))).slice (0, 12)}"`);
  fs.writeFileSync ("dist/index.html", html);
}
const shell = files.filter ((f) => ! f.startsWith ("data/") && ! f.endsWith (".map") && f !== "sw.js");
const shellHash = hash (Buffer.concat (shell.map ((f) => fs.readFileSync (path.join ("dist", f)))));
const sw = fs.readFileSync ("dist/sw.js", "utf8")
  .replace ("__SHELL__", shellHash)
  .replace ("__DATA__", hash (fs.readFileSync (DB)))
  .replace ("__FILES__", JSON.stringify (["./", ...shell]));
fs.writeFileSync ("dist/sw.js", sw);

const size = (f) => fs.statSync (path.join ("dist", f)).size;
const appBytes = shell.reduce ((n, f) => n + size (f), 0);
console.log (`dist/: app ${(appBytes / 1e6).toFixed (2)} MB (${shell.length} files), database ${(size ("data/cotext.db") / 1e6).toFixed (1)} MB`);
