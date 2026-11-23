import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { printSyncResult, syncContent } from "../lib/content.ts";

try {
  printSyncResult(await syncContent(process.cwd()));
  const args = process.argv.slice(2).map((arg) => (arg === "--serve" ? "-s" : arg));
  const env = { ...process.env };
  if (env.CONTENT_INCLUDE_DRAFTS === "true") env.LUME_DRAFTS = "true";
  let command: string[];
  if (args.includes("-s")) {
    const packageDirectory = new URL("../../", import.meta.resolve("@lumeland/lume"));
    const lumePackage = JSON.parse(await readFile(new URL("package.json", packageDirectory), "utf8"));
    command = [fileURLToPath(new URL(lumePackage.bin.lume, packageDirectory)), "build", ...args];
  } else {
    command = ["--import", "tsx", fileURLToPath(new URL("./render.ts", import.meta.url))];
  }
  const processGroup = process.platform !== "win32";
  const child = spawn(process.execPath, command, { stdio: "inherit", env, detached: processGroup });
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      if (processGroup && child.pid) {
        try {
          process.kill(-child.pid, signal);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
        }
      } else {
        child.kill(signal);
      }
    });
  }
  child.once("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  child.once("exit", (code) => {
    process.exitCode = code ?? 1;
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
