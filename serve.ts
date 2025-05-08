import Server, { type Options } from "lume/core/server.ts";

const server = new Server({
  root: `${Deno.cwd()}/_site`,
  port: 8000,
} as Options);

server.start();

console.log("Listening on http://localhost:8000");
