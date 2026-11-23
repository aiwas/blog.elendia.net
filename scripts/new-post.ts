import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { stringify } from "yaml";
import { isSlug } from "../lib/content.ts";

try {
  const [slug, title] = process.argv.slice(2);
  if (!process.env.CONTENT_DIR) throw new Error("記事を編集するローカルリポジトリを CONTENT_DIR に指定する");
  if (!isSlug(slug) || !title?.trim()) throw new Error('使用方法: npm run content:new -- slug "記事タイトル"');
  const directory = resolve(process.env.CONTENT_DIR, "posts", slug);
  await mkdir(join(directory, "assets"), { recursive: true });
  await writeFile(
    join(directory, "index.md"),
    `---\n${stringify({ title, date: new Date().toISOString(), url: `/posts/${slug}/`, tags: [], draft: true })}---\n\n本文を入力\n`,
    { flag: "wx" },
  );
  console.log(`記事を作成: ${join(directory, "index.md")}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
