/**
 * The tier-2 web-stack worker (json/css/html): thin RPC shell over the
 * pure service module. Lazy chunk, loaded on first relevant `vim` open.
 */
import { serveWorker } from "../rpc";
import { createWebService, type WebService } from "./service";

let svc: WebService | null = null;

serveWorker({
  init: (files: Record<string, string>) => {
    svc = createWebService(files);
    return true;
  },
  hover: (path: string, offset: number) => svc?.hover(path, offset) ?? null,
  definition: (path: string, offset: number) => svc?.definition(path, offset) ?? null,
  diagnostics: (path: string) => svc?.diagnostics(path) ?? [],
  symbols: (path: string) => svc?.symbols(path) ?? [],
});
