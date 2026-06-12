/**
 * The tier-3 data worker (yaml/toml): thin RPC shell over the pure
 * service module. Lazy chunk, loaded on first relevant `vim` open.
 */
import { serveWorker } from "../rpc";
import { createDataService, type DataService } from "./service";

let svc: DataService | null = null;

serveWorker({
  init: (files: Record<string, string>) => {
    svc = createDataService(files);
    return true;
  },
  hover: (path: string, offset: number) => svc?.hover(path, offset) ?? null,
  definition: (path: string, offset: number) => svc?.definition(path, offset) ?? null,
  diagnostics: (path: string) => svc?.diagnostics(path) ?? [],
  symbols: (path: string) => svc?.symbols(path) ?? [],
});
