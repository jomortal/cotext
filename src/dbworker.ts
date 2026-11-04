// The database's worker (built by build.mjs into dist/dbworker.js): SQLite and its files off the page's thread, where
// OPFS can be read (dbserver.ts). Each message a request, each answered by its id.

import { serve, type Request } from "./dbserver";

self.addEventListener ("message", (e: MessageEvent<Request>) => { serve (e.data, (r) => self.postMessage (r)); });
