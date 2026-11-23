import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import type { TestContext } from "node:test";
import { fileURLToPath } from "node:url";

export async function temporaryDirectory(t: TestContext): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "elendia-test-"));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}

export async function siteFixture(t: TestContext): Promise<{ root: string; content: string }> {
  const project = fileURLToPath(new URL("../", import.meta.url));
  const root = await temporaryDirectory(t);
  const content = await temporaryDirectory(t);
  for (const file of [
    "_config.ts",
    "_feed.ts",
    "_helper.ts",
    "_markdown.ts",
    "tsconfig.json",
    "package.json",
    "lib",
    "scripts",
  ]) {
    await cp(join(project, file), join(root, file), { recursive: true });
  }
  await cp(join(project, "src"), join(root, "src"), {
    recursive: true,
    filter: (path) => {
      const part = relative(join(project, "src"), path).split(sep).join("/");
      return !part.startsWith("posts/") || part === "posts/_data.json";
    },
  });
  await symlink(join(project, "node_modules"), join(root, "node_modules"), "dir");
  return { root, content };
}

export async function article(
  root: string,
  slug: string,
  options: {
    date?: string;
    draft?: boolean;
    body?: string;
  } = {},
): Promise<void> {
  const directory = join(root, "posts", slug);
  await mkdir(join(directory, "assets"), { recursive: true });
  await writeFile(
    join(directory, "assets", "figure.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>',
  );
  await writeFile(
    join(directory, "index.md"),
    `---
title: "記事 ${slug}"
date: ${options.date ?? "2026-11-20T01:30:00+09:00"}
url: /posts/${slug}/
tags:
  - TypeScript
  - 日本語
draft: ${options.draft ?? false}
---
${options.body ?? "![図](./assets/figure.svg)"}
`,
  );
}

export function git(root: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

export function commit(root: string): string {
  git(root, "add", ".");
  git(
    root,
    "-c",
    "user.name=Content test",
    "-c",
    "user.email=test@example.invalid",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "--quiet",
    "-m",
    "docs(content): テスト記事を更新",
  );
  return git(root, "rev-parse", "HEAD");
}
