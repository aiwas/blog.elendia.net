import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { isPublicationDate, syncContent } from "../lib/content.ts";
import { formatDate } from "../lib/date.ts";
import { article, commit, git, temporaryDirectory } from "./helpers.ts";

test("Git のブランチと固定コミットを取得し、記事・画像を同じ版で配置する", async (t) => {
  const root = await temporaryDirectory(t);
  const content = await temporaryDirectory(t);
  git(content, "init", "--quiet", "--initial-branch=published");
  await article(content, "first");
  const first = commit(content);
  await article(content, "second");
  const second = commit(content);
  const env = { CONTENT_REPOSITORY: content, CONTENT_REF: "published" };
  assert.equal((await syncContent(root, env)).commit, second);
  await access(join(root, "src/posts/second/assets/figure.svg"));
  assert.equal((await syncContent(root, { ...env, CONTENT_REF: first })).commit, first);
  await assert.rejects(access(join(root, "src/posts/second")));
  assert.deepEqual(JSON.parse(await readFile(join(root, "_content/synced-posts.json"), "utf8")).slugs, ["first"]);
  await assert.rejects(syncContent(root, { ...env, CONTENT_REF: "missing-ref" }), /Git 取得に失敗/);
  await access(join(root, "src/posts/first/index.md"));
});

test("削除と下書き化を反映し、管理対象外の記事と _data.json を残す", async (t) => {
  const root = await temporaryDirectory(t);
  const content = await temporaryDirectory(t);
  await mkdir(join(root, "src/posts/manual"), { recursive: true });
  await writeFile(join(root, "src/posts/manual/index.md"), "手元の記事");
  await writeFile(join(root, "src/posts/_data.json"), "{}");
  await article(content, "first");
  await article(content, "draft", { draft: true });
  await syncContent(root, { CONTENT_DIR: content });
  await assert.rejects(access(join(root, "src/posts/draft")));
  await article(content, "first", { draft: true });
  await article(content, "new");
  await syncContent(root, { CONTENT_DIR: content });
  await assert.rejects(access(join(root, "src/posts/first")));
  await access(join(root, "src/posts/new/index.md"));
  assert.equal(await readFile(join(root, "src/posts/manual/index.md"), "utf8"), "手元の記事");
  assert.equal(await readFile(join(root, "src/posts/_data.json"), "utf8"), "{}");
});

test("日時・画像・URL の検証に失敗した場合は配置済みの記事を変更しない", async (t) => {
  const root = await temporaryDirectory(t);
  const content = await temporaryDirectory(t);
  await article(content, "first");
  await syncContent(root, { CONTENT_DIR: content });
  const path = join(root, "src/posts/first/index.md");
  const previous = await readFile(path, "utf8");
  await article(content, "first", { date: "2026-02-31T00:00:00+09:00" });
  await assert.rejects(syncContent(root, { CONTENT_DIR: content }), /date/);
  await article(content, "first", { body: "![図](./assets/missing.svg)" });
  await assert.rejects(syncContent(root, { CONTENT_DIR: content }), /アセットが存在しない/);
  await article(content, "first");
  const sourcePath = join(content, "posts/first/index.md");
  await writeFile(sourcePath, (await readFile(sourcePath, "utf8")).replace("/posts/first/", "/posts/different/"));
  await assert.rejects(syncContent(root, { CONTENT_DIR: content }), /url/);
  assert.equal(await readFile(path, "utf8"), previous);
});

test("既存記事との衝突とアセットのシンボリックリンクを拒否する", async (t) => {
  const root = await temporaryDirectory(t);
  const content = await temporaryDirectory(t);
  await article(content, "first");
  await mkdir(join(root, "src/posts/first"), { recursive: true });
  await assert.rejects(syncContent(root, { CONTENT_DIR: content }), /既存の記事を上書き/);
  await rm(join(content, "posts/first/assets/figure.svg"));
  await symlink(join(root, "src/posts/first"), join(content, "posts/first/assets/outside"));
  await assert.rejects(syncContent(root, { CONTENT_DIR: content }), /シンボリックリンク/);
});

test("Vercel では未設定や下書きの公開を拒否し、Git の認証情報を URL に含めない", async (t) => {
  const root = await temporaryDirectory(t);
  const content = await temporaryDirectory(t);
  await article(content, "first");
  await assert.rejects(syncContent(root, { VERCEL: "1" }), /設定が必要/);
  await assert.rejects(
    syncContent(root, { VERCEL: "1", CONTENT_DIR: content, CONTENT_INCLUDE_DRAFTS: "true" }),
    /下書き/,
  );
  await assert.rejects(
    syncContent(root, { VERCEL: "1", MICROCMS_ENABLE: "true", CONTENT_INCLUDE_DRAFTS: "true" }),
    /下書き/,
  );
  await assert.rejects(syncContent(root, { VERCEL: "1", MICROCMS_ENABLE: "true", LUME_DRAFTS: "true" }), /下書き/);
  await assert.rejects(
    syncContent(root, { CONTENT_REPOSITORY: "https://user:secret@example.invalid/articles.git", CONTENT_REF: "main" }),
    /URL に含めない/,
  );
  await assert.rejects(
    syncContent(root, {
      CONTENT_REPOSITORY: "https://example.invalid/articles.git",
      CONTENT_REF: "main",
      CONTENT_GIT_TOKEN: "test-token",
    }),
    /CONTENT_GIT_USERNAME/,
  );
  const helper = fileURLToPath(new URL("../scripts/git-askpass.mjs", import.meta.url));
  const env = { ...process.env, CONTENT_GIT_USERNAME: "test-user", CONTENT_GIT_TOKEN: "test-token" };
  assert.equal(
    execFileSync(process.execPath, [helper, "Username for HTTPS"], { env, encoding: "utf8" }),
    "test-user\n",
  );
  assert.equal(
    execFileSync(process.execPath, [helper, "Password for HTTPS"], { env, encoding: "utf8" }),
    "test-token\n",
  );
});

test("公開日時は明示されたタイムゾーンで検証し、表示日は東京時間で決める", () => {
  assert.equal(isPublicationDate("2024-02-29T00:00:00+09:00"), true);
  assert.equal(isPublicationDate("2026-02-29T00:00:00+09:00"), false);
  assert.equal(isPublicationDate("2026-11-20"), false);
  const date = new Date("2026-11-19T16:30:00Z");
  assert.equal(formatDate(date), "2026/11/20");
});

test("記事作成コマンドの出力を同期でき、下書きは公開対象にならない", async (t) => {
  const root = await temporaryDirectory(t);
  const content = await temporaryDirectory(t);
  const command = fileURLToPath(new URL("../scripts/new-post.ts", import.meta.url));
  const env = { ...process.env, CONTENT_DIR: content };
  execFileSync(process.execPath, [command, "new-post", "新しい記事"], { env, encoding: "utf8" });
  assert.deepEqual((await syncContent(root, env)).slugs, []);
  assert.deepEqual((await syncContent(root, { ...env, CONTENT_INCLUDE_DRAFTS: "true" })).slugs, ["new-post"]);
  assert.match(await readFile(join(root, "src/posts/new-post/index.md"), "utf8"), /新しい記事/);
  assert.throws(() => execFileSync(process.execPath, [command, "new-post", "上書き"], { env, stdio: "pipe" }));
  assert.match(await readFile(join(content, "posts/new-post/index.md"), "utf8"), /新しい記事/);
});
