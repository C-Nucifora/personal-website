/**
 * The tier-2 TS worker: a thin RPC shell over the pure service module.
 * Lazy chunk — loaded on the first `vim` open of a ts/tsx/js file.
 */
import { serveWorker } from "../rpc";
import { createTsService, type TsService } from "./service";
import libs from "@/data/generated/ts-libs.json";

let svc: TsService | null = null;

serveWorker({
  init: (files: Record<string, string>) => {
    svc = createTsService({ files, libs: libs as Record<string, string> });
    return true;
  },
  hover: (path: string, offset: number) => svc?.hover(path, offset) ?? null,
  definition: (path: string, offset: number) => svc?.definition(path, offset) ?? null,
  diagnostics: (path: string) => svc?.diagnostics(path) ?? [],
  symbols: (path: string) => svc?.symbols(path) ?? [],
});
