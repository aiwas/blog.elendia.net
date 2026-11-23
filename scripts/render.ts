import { log } from "@lumeland/core/utils/log.ts";
import site from "../_config.ts";

try {
  await site.build();
  if (log.hasErrors) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  log.output();
}
