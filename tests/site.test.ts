import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createServer } from "node:net";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { article, siteFixture } from "./helpers.ts";

function runSite(root: string, content: string, env: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, [join(root, "scripts/build.ts")], {
    cwd: root,
    env: {
      ...process.env,
      CONTENT_DIR: content,
      CONTENT_INCLUDE_DRAFTS: "false",
      MICROCMS_ENABLE: "false",
      VERCEL: "",
      LUME_DRAFTS: "false",
      ...env,
    },
    encoding: "utf8",
    timeout: 60_000,
  });
}

test("記事付きの v4 ビルドで URL・ページ送り・埋め込み・画像・フィードを生成する", async (t) => {
  const { root, content } = await siteFixture(t);
  for (let index = 1; index <= 11; index++) {
    await article(content, `post-${index}`, { date: `2026-11-${String(index).padStart(2, "0")}T01:30:00+09:00` });
  }
  await article(content, "post-11", {
    date: "2026-11-11T01:30:00+09:00",
    body: `[[toc]]

## Heading

*[HTML]: Hyper Text Markup Language

HTML test H~2~O x^2^ and a note.[^note]

[^note]: Footnote text.

Term
: Definition

::: warning
Warning text.
:::

\`\`\`csharp:example.cs
public class Example {}
\`\`\`

![図](./assets/figure.svg)

{{ youtube "video-id" }}

{{ toot "https://example.invalid/@user/321" }}

{{ comp.toot({ url: "https://example.invalid/@user/123" }) }}

{{ components["gist"]({ url: "https://gist.github.com/example/components.git-legacy" }) |> safe }}

[外部](https://example.com/)
`,
  });
  await article(content, "draft", { draft: true });
  await writeFile(join(root, "src/posts/2020-06-21_legacy.md"), "---\ntitle: Legacy post\ntags: []\n---\nLegacy body");
  await mkdir(join(root, "src/pages"), { recursive: true });
  await writeFile(join(root, "src/pages/about.md"), "---\ntitle: About\n---\nPage body");
  const result = runSite(root, content);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const html = await readFile(join(root, "_site/index.html"), "utf8");
  assert.equal((html.match(/aria-rowindex=/g) ?? []).length, 10);
  assert.ok(html.indexOf("post-11/") < html.indexOf("post-10/"));
  assert.match(html, /href="\/posts\/page\/2\/"/);
  assert.match(html, /class="nav"/);
  assert.match(html, /2026\/11\/11/);
  assert.match(html, /datetime="2026-11-10T16:30:00.000Z"/);
  assert.doesNotMatch(html, /dateTime=|className=/);
  await access(join(root, "_site/posts/page/2/index.html"));
  await access(join(root, "_site/tags/日本語/index.html"));
  await access(join(root, "_site/posts/legacy/index.html"));
  await access(join(root, "_site/pages/about/index.html"));
  await access(join(root, "_site/style.css"));
  assert.match(await readFile(join(root, "_site/components.css"), "utf8"), /mastodon-embed/);
  assert.match(await readFile(join(root, "_site/components.css"), "utf8"), /\.gist \.gist-file/);
  await access(join(root, "_site/favicon.svg"));
  const post = await readFile(join(root, "_site/posts/post-11/index.html"), "utf8");
  for (const pattern of [
    /table-of-contents/,
    /footnote/,
    /<abbr/,
    /<sub>2<\/sub>/,
    /<sup>2<\/sup>/,
    /<dl>/,
    /class="warning"/,
    /example.cs/,
    /token keyword/,
    /youtube.com\/embed\/video-id/,
    /<script src="https:\/\/gist.github.com\/example\/components.git-legacy.js"><\/script>/,
    /target="_blank"/,
  ])
    assert.match(post, pattern);
  assert.doesNotMatch(post, /\[object Promise\]/);
  await access(join(root, "_site/posts/post-11/assets/figure.svg"));
  await assert.rejects(access(join(root, "_site/posts/draft")));
  const feed = JSON.parse(await readFile(join(root, "_site/posts.json"), "utf8"));
  assert.equal(feed.title, "Forest of Elendia");
  assert.equal(feed.items.length, 10);
  assert.equal(feed.items[0].url, "https://blog.elendia.net/posts/post-11/");
  assert.match(feed.items[0].content_html, /https:\/\/blog.elendia.net\/posts\/post-11\/assets\/figure.svg/);
  const rss = await readFile(join(root, "_site/posts.rss"), "utf8");
  assert.match(rss, /Forest of Elendia/);
  assert.equal((rss.match(/<item>/g) ?? []).length, 10);
});

test("テンプレートの変換エラーを終了コードに反映し、生成物を保存しない", async (t) => {
  const { root, content } = await siteFixture(t);
  await article(content, "broken", { body: "{{ if }}\n本文" });
  const result = runSite(root, content);
  assert.notEqual(result.status, 0);
  await assert.rejects(access(join(root, "_site/posts/broken/index.html")));
});

test("microCMS を併用でき、Git 記事との URL 重複と取得失敗はビルドを失敗させる", async (t) => {
  const { root, content } = await siteFixture(t);
  await article(content, "git-entry");
  const env = {
    MICROCMS_ENABLE: "true",
    MICROCMS_SERVICE_DOMAIN: "migration-test",
    MICROCMS_API_KEY: "fake-api-key",
    NODE_OPTIONS: `--import=${new URL("./fixtures/microcms.mjs", import.meta.url).href}`,
  };
  const result = runSite(root, content, env);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const cms = await readFile(join(root, "_site/posts/cms-entry/index.html"), "utf8");
  assert.match(cms, /CMS body/);
  assert.match(cms, /youtube.com\/embed\/cms-video/);
  assert.match(cms, /<details>/);
  assert.match(cms, /<script src="https:\/\/gist.github.com\/aiwas\/48c9e6f8158cd7466c7abf97ff364edd.js"><\/script>/);
  assert.doesNotMatch(cms, /\[object Promise\]/);
  assert.match(await readFile(join(root, "_site/components.css"), "utf8"), /\.gist \.gist-file/);
  await access(join(root, "_site/posts/git-entry/index.html"));
  await article(content, "cms-entry");
  const duplicate = runSite(root, content, env);
  assert.notEqual(duplicate.status, 0);
  assert.match(duplicate.stdout + duplicate.stderr, /パスが重複/);
  const failure = runSite(root, content, { ...env, MOCK_CMS_FAILURE: "true" });
  assert.notEqual(failure.status, 0);
});

test("開発サーバーから記事と画像を取得でき、終了時に子プロセスも停止する", async (t) => {
  const { root, content } = await siteFixture(t);
  await article(content, "server-post");
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const address = reservation.address();
  assert.ok(address && typeof address === "object");
  const port = address.port;
  reservation.close();
  await once(reservation, "close");
  const child = spawn(
    process.execPath,
    [join(root, "scripts/build.ts"), "--serve", "--port", String(port), "--hostname", "127.0.0.1"],
    {
      cwd: root,
      env: {
        ...process.env,
        CONTENT_DIR: content,
        CONTENT_INCLUDE_DRAFTS: "false",
        MICROCMS_ENABLE: "false",
        VERCEL: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const stopped = once(child, "exit");
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
    await stopped;
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  child.stderr.on("data", (chunk) => {
    output += chunk;
  });
  const base = `http://127.0.0.1:${port}`;
  let html = "";
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      html = await (await fetch(`${base}/posts/server-post/`, { signal: AbortSignal.timeout(500) })).text();
      if (html.includes("記事 server-post")) break;
    } catch {
      // サーバーの初回ビルドを待つ。
    }
    await delay(50);
  }
  assert.match(html, /記事 server-post/, output);
  assert.equal((await fetch(`${base}/posts/server-post/assets/figure.svg`)).status, 200);
  child.kill("SIGTERM");
  await stopped;
  await assert.rejects(fetch(base, { signal: AbortSignal.timeout(500) }));
});
