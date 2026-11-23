#!/usr/bin/env node
const prompt = process.argv[2] ?? "";
const value = /username/i.test(prompt) ? process.env.CONTENT_GIT_USERNAME : process.env.CONTENT_GIT_TOKEN;
if (!value) {
  process.exit(1);
}
process.stdout.write(value + "\n");
