// Builds the app into dist/: public/ copied as it is (but the whole database, which the app never reads), src/ bundled
// by esbuild into app.js (and the database's worker, dbworker.js), and the service worker given the app's file list
// and its hash. Run: npm run build  (after python3 pipeline/build_db.py has made the database)
import * as esbuild from "esbuild";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DB = "public/data/cotext.db", PARTS = "public/data/db";
if (! fs.existsSync (DB)) {
  console.error (`${DB} is missing: run python3 pipeline/build_db.py first.`);
  process.exit (1);
}
const hash = (buf) => crypto.createHash ("sha256").update (buf).digest ("hex").slice (0, 12);

// The database's parts (pipeline/split_db.py: the files the app downloads), split again whenever cotext.db is newer
// than them - a run-alone pipeline script (notes.py, grammar.py...) edits cotext.db only. Each part's version is a
// hash of its bytes, so an update re-downloads only the parts that changed (src/dbserver.ts); core first.
const parts = () => fs.existsSync (PARTS) ? fs.readdirSync (PARTS).filter ((f) => f.endsWith (".db")) : [];
if (! parts ().includes ("core.db") || parts ().some ((f) => fs.statSync (path.join (PARTS, f)).mtimeMs < fs.statSync (DB).mtimeMs)) {
  execFileSync ("python3", ["pipeline/split_db.py"], { stdio: "inherit" });
  for (const f of parts ()) fs.utimesSync (path.join (PARTS, f), new Date (), new Date ());     // (Written only when changed: all marked as split now)
}
const DB_FILES = parts ().sort ((a, b) => (b === "core.db") - (a === "core.db") || a.localeCompare (b)).map ((f) => {
  const data = fs.readFileSync (path.join (PARTS, f));
  return { part: f.slice (0, -3), version: hash (data), bytes: data.length };
});

fs.rmSync ("dist", { recursive: true, force: true });
fs.cpSync ("public", "dist", { recursive: true, filter: (f) => path.resolve (f) !== path.resolve (DB) });

// The database's worker first (src/dbworker.ts: SQLite and its files off the page's thread), then the app, which
// starts it by its address with its content's hash (DB_WORKER) - so a new build's is never an old copy.
const options = { bundle: true, format: "esm", minify: true, sourcemap: true, target: ["safari15", "chrome100", "firefox100"] };
await esbuild.build ({ ...options, entryPoints: ["src/dbworker.ts"], outfile: "dist/dbworker.js" });
await esbuild.build ({
  ...options, entryPoints: ["src/main.ts"], outfile: "dist/app.js",
  define: { DB_FILES: JSON.stringify (DB_FILES),
            DB_WORKER: JSON.stringify (`dbworker.js?v=${hash (fs.readFileSync ("dist/dbworker.js"))}`) },
});

// Every file but the data (the page keeps its own: src/dbserver.ts) and the source maps, as the page asks for them.
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
  for (const f of ["app.js", "style.css", "diagram.css"])
    html = html.replace (`"${f}"`, `"${f}?v=${hash (fs.readFileSync (path.join ("dist", f))).slice (0, 12)}"`);
  fs.writeFileSync ("dist/index.html", html);
}
const shell = files.filter ((f) => ! f.startsWith ("data/") && ! f.endsWith (".map") && f !== "sw.js");
const shellHash = hash (Buffer.concat (shell.map ((f) => fs.readFileSync (path.join ("dist", f)))));
const sw = fs.readFileSync ("dist/sw.js", "utf8")
  .replace ("__SHELL__", shellHash)
  .replace ("__FILES__", JSON.stringify (["./", ...shell]));
fs.writeFileSync ("dist/sw.js", sw);

const size = (f) => fs.statSync (path.join ("dist", f)).size;
const appBytes = shell.reduce ((n, f) => n + size (f), 0);
console.log (`dist/: app ${(appBytes / 1e6).toFixed (2)} MB (${shell.length} files), database `
             + DB_FILES.map ((f) => `${f.part} ${(f.bytes / 1e6).toFixed (1)} MB (${f.version})`).join (", "));
