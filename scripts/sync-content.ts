import { printSyncResult, syncContent } from "../lib/content.ts";

try {
  printSyncResult(await syncContent(process.cwd()));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
