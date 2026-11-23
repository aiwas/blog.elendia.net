import { spawnSync } from "node:child_process";
import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";
import { parse, stringify } from "yaml";

export const assetExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg", ".pdf"];

interface Bundle {
  slug: string;
  markdown: string;
  assets: { source: string; path: string }[];
}

interface SyncResult {
  source: "git" | "local" | "existing";
  commit: string | null;
  siteCommit: string | null;
  slugs: string[];
}

const markdown = new MarkdownIt({ html: true });
const manifestName = "synced-posts.json";

export function isPublicationDate(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  ) {
    return false;
  }
  const local = new Date(`${value.slice(0, 19)}Z`);
  return (
    Number.isFinite(Date.parse(value)) &&
    Number.isFinite(local.getTime()) &&
    local.toISOString().slice(0, 19) === value.slice(0, 19)
  );
}

export function isSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !/^[._]|[/\\%?#\s]/u.test(value) &&
    !value.includes(String.fromCharCode(0))
  );
}

async function exists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function assertDirectory(path: string): Promise<void> {
  const stat = await lstat(path);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(`通常のディレクトリが必要: ${path}`);
  }
}

async function readAssets(directory: string, base = directory): Promise<Bundle["assets"]> {
  if (!(await exists(directory))) {
    return [];
  }
  await assertDirectory(directory);
  const files: Bundle["assets"] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (/^[._]/.test(entry.name)) {
      throw new Error(`Lume が除外するアセット名は使用できない: ${path}`);
    }
    if (entry.isSymbolicLink()) {
      throw new Error(`アセットのシンボリックリンクは使用できない: ${path}`);
    }
    if (entry.isDirectory()) {
      files.push(...(await readAssets(path, base)));
    } else if (entry.isFile() && assetExtensions.includes(extname(entry.name).toLowerCase())) {
      files.push({ source: path, path: relative(base, path) });
    } else {
      throw new Error(`未対応のアセット: ${path}`);
    }
  }
  return files;
}

function validateAssetReferences(body: string, bundle: Bundle): void {
  const available = new Set(bundle.assets.map((asset) => `assets/${asset.path.split(sep).join("/")}`));
  const check = (reference: string) => {
    if (!reference || /^(?:[a-z][a-z\d+.-]*:|\/\/|\/|#)/i.test(reference)) {
      return;
    }
    const base = new URL(`https://content.invalid/posts/${bundle.slug}/`);
    const url = new URL(reference, base);
    const prefix = base.pathname;
    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    if (!url.pathname.startsWith(prefix) || !available.has(path)) {
      throw new Error(`${bundle.slug}: 参照先のアセットが存在しない: ${reference}`);
    }
  };
  for (const token of markdown.parse(body, {})) {
    for (const child of token.children ?? []) {
      if (child.type === "image") {
        check(String(child.attrGet("src") ?? ""));
      }
      if (child.type === "link_open") {
        const href = String(child.attrGet("href") ?? "");
        if (/^(?:\.\/)?assets\//.test(href)) {
          check(href);
        }
      }
    }
  }
  for (const match of body.matchAll(/<(?:img|source)\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) {
    check(match[1]);
  }
}

async function readBundles(source: string, includeDrafts: boolean): Promise<Bundle[]> {
  const posts = join(source, "posts");
  await assertDirectory(posts);
  const bundles: Bundle[] = [];
  const urls = new Set<string>();
  for (const entry of await readdir(posts, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.isSymbolicLink() || !isSlug(entry.name)) {
      throw new Error(`記事は posts/{slug}/index.md に配置する: ${entry.name}`);
    }
    const directory = join(posts, entry.name);
    for (const child of await readdir(directory, { withFileTypes: true })) {
      if (child.isSymbolicLink() || !["index.md", "assets"].includes(child.name)) {
        throw new Error(`記事ディレクトリ内の未対応ファイル: ${entry.name}/${child.name}`);
      }
    }
    const text = await readFile(join(directory, "index.md"), "utf8");
    const frontMatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
    if (!frontMatter) {
      throw new Error(`${entry.name}: front matter が必要`);
    }
    const data: unknown = parse(frontMatter[1]);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error(`${entry.name}: メタデータが不正`);
    }
    const meta = data as Record<string, unknown>;
    if (typeof meta.title !== "string" || !meta.title.trim()) {
      throw new Error(`${entry.name}: title が必要`);
    }
    if (!isPublicationDate(meta.date)) {
      throw new Error(`${entry.name}: date はタイムゾーン付きの有効な公開日時が必要`);
    }
    if (
      meta.tags !== undefined &&
      (!Array.isArray(meta.tags) || meta.tags.some((tag) => typeof tag !== "string" || !tag.trim()))
    ) {
      throw new Error(`${entry.name}: tags は文字列の配列が必要`);
    }
    if (meta.draft !== undefined && typeof meta.draft !== "boolean") {
      throw new Error(`${entry.name}: draft は真偽値が必要`);
    }
    const url = `/posts/${entry.name}/`;
    if (meta.url !== undefined && meta.url !== url) {
      throw new Error(`${entry.name}: url は ${url} に合わせる`);
    }
    if (urls.has(url.toLowerCase())) {
      throw new Error(`記事 URL が重複: ${url}`);
    }
    urls.add(url.toLowerCase());
    if (meta.draft === true && !includeDrafts) {
      continue;
    }
    const body = text.slice(frontMatter[0].length);
    const bundle: Bundle = {
      slug: entry.name,
      markdown: `---\n${stringify({ ...meta, url, tags: meta.tags ?? [] })}---\n${body}`,
      assets: await readAssets(join(directory, "assets")),
    };
    validateAssetReferences(body, bundle);
    bundles.push(bundle);
  }
  return bundles;
}

function git(args: string[], cwd: string, env: NodeJS.ProcessEnv): string {
  const result = spawnSync("git", ["-c", "credential.helper=", ...args], {
    cwd,
    env: { ...env, GIT_TERMINAL_PROMPT: "0" },
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 2 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const message = result.error?.message ?? result.stderr.trim();
    throw new Error(
      `記事の Git 取得に失敗: ${env.CONTENT_GIT_TOKEN ? message.replaceAll(env.CONTENT_GIT_TOKEN, "[redacted]") : message}`,
    );
  }
  return result.stdout.trim();
}

async function checkout(repository: string, ref: string, directory: string, env: NodeJS.ProcessEnv): Promise<string> {
  if (ref.startsWith("-")) {
    throw new Error("CONTENT_REF が不正");
  }
  if (!isAbsolute(repository)) {
    const url = new URL(repository);
    if (url.username || url.password) {
      throw new Error("認証情報はリポジトリ URL に含めない");
    }
    if (!["https:", "ssh:", "file:"].includes(url.protocol)) {
      throw new Error("Git の接続先は HTTPS / SSH / file URL を指定する");
    }
  }
  if (env.CONTENT_GIT_TOKEN) {
    if (!repository.startsWith("https://")) {
      throw new Error("トークンによる Git 取得には HTTPS URL を指定する");
    }
    if (!env.CONTENT_GIT_USERNAME) {
      throw new Error("Git ホストのトークン認証用ユーザー名を CONTENT_GIT_USERNAME に指定する");
    }
    env = { ...env, GIT_ASKPASS: fileURLToPath(new URL("../scripts/git-askpass.mjs", import.meta.url)) };
  }
  git(["init", "--quiet"], directory, env);
  git(["remote", "add", "origin", repository], directory, env);
  git(["fetch", "--quiet", "--depth=1", "origin", ref], directory, env);
  git(["checkout", "--quiet", "--detach", "FETCH_HEAD"], directory, env);
  return git(["rev-parse", "HEAD"], directory, env);
}

async function stageBundles(
  root: string,
  bundles: Bundle[],
  commit: string | null,
  siteCommit: string | null,
): Promise<void> {
  const posts = join(root, "src", "posts");
  await mkdir(posts, { recursive: true });
  await assertDirectory(posts);
  const manifest = join(root, "_content", manifestName);
  const previous: unknown = (await exists(manifest)) ? JSON.parse(await readFile(manifest, "utf8")) : { slugs: [] };
  if (
    !previous ||
    typeof previous !== "object" ||
    !("slugs" in previous) ||
    !Array.isArray(previous.slugs) ||
    !previous.slugs.every(isSlug)
  ) {
    throw new Error("記事の同期記録が不正。配置済みの記事を確認すること");
  }
  const managed = new Set<string>(previous.slugs);
  for (const bundle of bundles) {
    if ((await exists(join(posts, bundle.slug))) && !managed.has(bundle.slug)) {
      throw new Error(`既存の記事を上書きできない: ${bundle.slug}`);
    }
  }
  const staging = await mkdtemp(join(root, "_content", "staging-"));
  try {
    for (const bundle of bundles) {
      const directory = join(staging, bundle.slug);
      await mkdir(directory);
      await writeFile(join(directory, "index.md"), bundle.markdown);
      for (const asset of bundle.assets) {
        const destination = join(directory, "assets", asset.path);
        await mkdir(dirname(destination), { recursive: true });
        await copyFile(asset.source, destination);
      }
    }
    for (const slug of managed) {
      await rm(join(posts, slug), { recursive: true, force: true });
    }
    for (const bundle of bundles) {
      await rename(join(staging, bundle.slug), join(posts, bundle.slug));
    }
    await writeFile(
      `${manifest}.tmp`,
      JSON.stringify({ slugs: bundles.map((bundle) => bundle.slug), commit, siteCommit }, null, 2) + "\n",
    );
    await rename(`${manifest}.tmp`, manifest);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

export async function syncContent(root: string, env: NodeJS.ProcessEnv = process.env): Promise<SyncResult> {
  const siteCommit =
    env.VERCEL_GIT_COMMIT_SHA ||
    spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout?.trim() ||
    null;
  const includeDrafts = env.CONTENT_INCLUDE_DRAFTS === "true";
  if (env.VERCEL && (includeDrafts || env.LUME_DRAFTS === "true")) {
    throw new Error("Vercel の公開物には下書きを含めない。確認にはローカル開発環境を使うこと");
  }
  if (!env.CONTENT_DIR && !env.CONTENT_REPOSITORY) {
    if (env.VERCEL && env.MICROCMS_ENABLE !== "true") {
      throw new Error("Vercel では記事リポジトリか microCMS の設定が必要");
    }
    return { source: "existing", commit: null, siteCommit, slugs: [] };
  }
  await mkdir(join(root, "_content"), { recursive: true });
  let source = env.CONTENT_DIR ? resolve(root, env.CONTENT_DIR) : "";
  let checkoutDirectory: string | undefined;
  let commit: string | null = null;
  try {
    if (!source) {
      if (!env.CONTENT_REF) {
        throw new Error("CONTENT_REF に記事の取得対象ブランチ・タグ・コミットを指定する");
      }
      checkoutDirectory = await mkdtemp(join(root, "_content", "checkout-"));
      source = checkoutDirectory;
      commit = await checkout(env.CONTENT_REPOSITORY!, env.CONTENT_REF, source, env);
    }
    const bundles = await readBundles(source, includeDrafts);
    await stageBundles(root, bundles, commit, siteCommit);
    return {
      source: checkoutDirectory ? "git" : "local",
      commit,
      siteCommit,
      slugs: bundles.map((bundle) => bundle.slug),
    };
  } finally {
    if (checkoutDirectory) {
      await rm(checkoutDirectory, { recursive: true, force: true });
    }
  }
}

export function printSyncResult(result: SyncResult): void {
  if (result.siteCommit) {
    console.log(`サイト: commit ${result.siteCommit}`);
  }
  if (result.source === "existing") {
    console.log("記事: ローカル記事と有効な microCMS を使用");
  } else {
    console.log(
      `記事: ${result.slugs.length} 件を同期 (${result.source}${result.commit ? `, commit ${result.commit}` : ""})`,
    );
  }
}
