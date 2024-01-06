import { ScriptsConfiguration } from "https://deno.land/x/velociraptor@1.5.0/mod.ts";

export default <ScriptsConfiguration> {
  envFile: [
    ".env.development",
  ],
  scripts: {
    lume: "echo \"import 'lume/cli.ts'\" | deno run --unstable -A -",
    build: "deno task lume",
    serve: "deno task lume --serve",
    dev: "LUME_DRAFTS=True deno task lume --serve",
    new: "deno task lume new new-post",
  },
};
