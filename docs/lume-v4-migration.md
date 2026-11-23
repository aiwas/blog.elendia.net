# Lume v2.0.2 から v4 への移行手順

調査日: 2026-11-20。実装更新: 2026-11-23。
Lume v4.0.3 / Node.js 24 への移行を実装中。以下の調査記録は移行前の v2.0.2 を基準にしている。
現在のコマンドと設定は [README](../README.md) を参照。

## ローカルで実装した範囲と残りの作業

- npm / SSX / Vento 向けに依存関係とテンプレートを移行し、Deno 用設定を削除した。
- 記事の取得・検証・配置、HTTPS トークン認証、ローカルの記事作成を実装した。
- microCMS はユーザーの指定により一時的に残し、Git 記事との併用をモックで検証する。
- 書式確認は Oxfmt、静的解析は Oxlint に移した。Vento は整形対象外。
- 通常の Lume CLI が変換エラーでも成功終了するケースを確認したため、
  公開用生成では Lume を直接呼び、ログ上のエラーも終了コードに反映する。
- クリーンな `npm ci`、Oxfmt、Oxlint、型検査、11 件のテスト、通常ビルドが成功した。
  テストでは記事入りの生成・ページ送り・画像・フィード・変換失敗・開発サーバーの起動と終了を確認した。
- Vercel 用設定と Node.js の CI は追加済み。配信先は既存の `elendia-network/blog-elendia-net` と確認済み。
  API キーとビルド設定はユーザーがダッシュボードで入力済み。v4 の Vercel ビルド・配信と記事 Git ホストでの認証は未確認。
- 記事リポジトリは非公開予定で、URL と取得ブランチが未定。記事のエクスポートも未実施。

ここから先は移行時の調査・判断の記録。

記事の管理先は、別の Git リポジトリからビルド時に取得する方針へ変更する。 構成と移行順序は
[記事リポジトリの設計案](./content-repository.md) を参照。 以下の microCMS
関連の対応は併用期間が必要な場合の案とし、最終構成では記事の Git 取得に置き換える。

Lume v4 は Node.js 24 LTS 以上で動作し、npm の `@lumeland/lume` と個別のプラグインに分かれた。 このブログは v2.0.2
なので、v3 の仕様変更と v4 の実行環境変更を両方反映する必要がある。 Node.js
環境に直接移し、下記の変更を段階的に検証する方針を推奨する。 v3 を本番運用する中間段階は必須ではない。 根拠:
[v4 移行ガイド](https://lume.land/docs/advanced/migrate-to-lume4/)、
[v3 移行ガイド](https://lume.land/docs/advanced/migrate-to-lume3/)。

## Node.js と npm の設定を用意する

1. 作業ブランチを作り、現行環境で生成できる場合は `_site/` を比較用に保管する。 ローカル記事は Git
   除外対象なので、別の作業ツリーには自動で引き継がれない。
2. 開発環境と CI の Node.js を 24 LTS にそろえる。
3. `package.json` と `tsconfig.json` を追加する。
   以下は手動移行での初期設定案。依存パッケージの版は実装時に確認し、lockfile で固定する。

```json
{
  "private": true,
  "type": "module",
  "engines": { "node": "24.x" },
  "scripts": {
    "build": "lume build",
    "serve": "lume build -s"
  }
}
```

```sh
npm install @lumeland/lume@^4 @lumeland/core @lumeland/ssx
npm install @lumeland/plugin-jsx @lumeland/plugin-metas @lumeland/plugin-feed @lumeland/plugin-sass @lumeland/plugin-prism
npm install @lumeland/plugin-markdown prismjs@^1.30.0
npm install markdown-it-anchor markdown-it-abbr markdown-it-sub markdown-it-sup markdown-it-footnote markdown-it-table-of-contents markdown-it-container markdown-it-named-code-blocks markdown-it-block-embed
npm install --save-dev typescript @types/node
```

Prism は npm audit の指摘に対応して 1.30.0 以上へ更新した。 microCMS を一時的に維持する場合だけ SDK
も導入する。 Markdown 拡張は現在 URL import の版指定がないため、既存 lockfile と導入先の互換性を確認する。
`@lumeland/plugin-markdown` は `_markdown.ts` の型を直接参照するため明示的な依存に含める。 Tailwind / PostCSS
は現状で無効なので追加しない。

`tsconfig.json` は公式生成ツールの設定を基に、型検査用の `noEmit` を加える。

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "jsx": "react-jsx",
    "jsxImportSource": "@lumeland/ssx",
    "allowImportingTsExtensions": true,
    "rewriteRelativeImportExtensions": true,
    "erasableSyntaxOnly": true,
    "noEmit": true
  }
}
```

Node.js 単体が TSX を実行できる前提にはしない。Lume CLI は `tsx` を使って起動する。 根拠:
[公式生成ツール](https://github.com/lumeland/lume/blob/main/packages/create-lume/cli.ts)、
[JSX の設定](https://lume.land/plugins/jsx/)、
[CLI の起動処理](https://github.com/lumeland/lume/blob/main/packages/lume/bin.ts)。

公式の `npm create lume .` を使う方法もある。既存プロジェクトを検出して移行処理を行うが、 現在の実装は主に `_config.ts`
の `from` 付き import を置換する。 このブログでは別ファイルの HTTP import、Prism の副作用 import、Deno API、v2
の設定が残る。 自動移行だけで完了とせず、手動移行と同じ確認を行う。 根拠:
[自動移行ガイド](https://lume.land/docs/advanced/migrate-to-lume4/#automatic-migration)、
[移行処理の実装](https://github.com/lumeland/lume/blob/main/packages/create-lume/cli.ts)。

## import と Deno API を置き換える

| 対象                                                          | 変更内容                                                                                              |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `_config.ts`                                                  | `lume/mod.ts` → `@lumeland/lume`。各プラグイン → `@lumeland/plugin-*`                                 |
| `_config.ts`                                                  | `npm:prismjs@1.29.0/components/...` → `prismjs/components/...`。副作用 import も対象                  |
| `_feed.ts`                                                    | `Options` 型を `@lumeland/plugin-feed` から取得                                                       |
| `_markdown.ts`                                                | `Options` 型を `@lumeland/plugin-markdown` から取得。`jspm.dev` の各 import を npm パッケージ名に変更 |
| `_helper.ts`                                                  | `Site` 型を `@lumeland/core/site.ts` から取得                                                         |
| `src/_components/jsx/PostList.tsx`                            | `Data` 型を `@lumeland/core/types.ts` から取得、または `Lume.Data` を利用                             |
| `_config.ts` / `src/microcms.page.ts`                         | `Deno.env.get(...)` → `process.env.変数名`、`Deno.env.set(...)` → `process.env.変数名 = 値`           |
| `src/microcms.page.ts`                                        | `microcms` エイリアス → `microcms-js-sdk`                                                             |
| `src/_components/date.ts` / `src/_components/jsx/DateTag.tsx` | Deno 向け Ptera の URL import を解消。`Intl.DateTimeFormat` などで東京時間の表示を共通化              |
| `src/_archetypes/new-post.ts`                                 | `std/datetime/format.ts` を解消。東京時間で `yyyy-MM-dd` を作る共通処理に置換                         |

`Data` は旧 `core/file.ts` と同じ場所から取得する単純置換では解決しない。 根拠:
[core の型定義](https://github.com/lumeland/lume/blob/main/packages/core/src/types.ts)。

日付は表示文字列と `<time datetime>` の意味を維持する。 記事の生成日を UTC の `toISOString().slice(0, 10)`
で作ると、日本時間の午前に日付がずれるため避ける。 CMS の `publishedAt`
も、記事の日付として従来どおり扱えることを確認する。

開発用の `.env.development` は、設定処理の最初に Node.js の `process.loadEnvFile` で読むなど、
読込先と実行条件を明示する。CI では引き続き環境変数を直接渡す。 `.env.production` を自動で読む前提は置かない。 根拠:
[Node.js の環境変数 API](https://nodejs.org/docs/latest-v24.x/api/process.html#processloadenvfilepath)。

## v3 以降のページ・アセット仕様に合わせる

| 対象                                  | 必要な対応                                                                                                |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/index.tsx` / `src/tags.tsx`      | `index.page.tsx` / `tags.page.tsx` に変更。レイアウトと直接 import する部品は `.tsx` のままでよい         |
| `deno.json` の React JSX 設定         | `tsconfig.json` の `jsxImportSource: "@lumeland/ssx"` に移す。React 型への URL 参照を外す                 |
| `_config.ts` の `components.variable` | 現行 v4 の設定に存在しないため削除。`post.vto` の `components.date(...)` は `comp.date(...)` に変更       |
| コンポーネント CSS                    | `components.cssFile: "/components.css"` を明示して現行リンクを維持。Sass が出力する `/style.css` と分ける |
| Sass                                  | `site.use(sass())` に加え、`site.add("style.scss")` を追加                                                |
| favicon                               | `site.add("favicon.svg")` を追加して出力を明示                                                            |
| ローカル記事の日付                    | `@lumeland/plugin-extract-date` を登録。`yyyy-MM-dd_slug.md` からの日付抽出と URL 生成を維持              |
| Prism                                 | `prism({ extensions: [...] })` を `prism()` に変更。C#、TypeScript、Bash、PowerShell などの言語登録は維持 |
| `_markdown.ts`                        | `keepDefaultPlugins` を現行の `useDefaultPlugins` に変更。既定の attrs / deflist と独自拡張を確認         |

ページ名・アセット・プラグインオプションの変更は [v3 移行ガイド](https://lume.land/docs/advanced/migrate-to-lume3/)、
Sass の入力登録は [Sass の説明](https://lume.land/plugins/sass/)、 日付抽出は
[Extract date の説明](https://lume.land/plugins/extract_date/) を参照。 `comp` とオプションの対応は
[Vento の説明](https://lume.land/plugins/vento/)、
[現行 Site の実装](https://github.com/lumeland/lume/blob/main/packages/core/src/site.ts)、
[現行 Markdown プラグイン](https://github.com/lumeland/lume/blob/main/packages/plugin-markdown/src/mod.ts)
でも確認した。

`site.copy([".jpg", ".png"])` と HTML の後処理に使う `site.process` は現行 v4 にも存在する。 削除された API
として一律に置換する必要はない。 プラグインは登録順が処理順に影響するため、本文変換・Prism・外部リンクの後処理後に、
必要な内容がフィードへ反映される順序を検証する。 根拠:
[Site の実装](https://github.com/lumeland/lume/blob/main/packages/core/src/site.ts)、
[v3 のプラグイン順序変更](https://lume.land/docs/advanced/migrate-to-lume3/#plugins-order)。

Git の記事へ切り替えた後は、microCMS のジェネレーターと SDK を削除する。 記事を取得・配置してから Lume を実行し、通常の
Markdown 記事として一覧・タグ・フィードへ流す。 日付を front matter に移した記事には Extract date
は不要で、旧形式の記事を残す間だけ利用する。

microCMS を一時的に併用する場合も、`@lumeland/cms` の導入は不要。 既存ジェネレーターの
`renderOrder = -1`、`type: "post"`、`templateEngine: ["vto", "md"]` を維持し、 SDK
から取得した記事が一覧・タグ・フィードへ流れることを確かめる。

## 既存の Vercel プロジェクトで Node.js ビルドへ切り替える

移行前のリポジトリには Deno Deploy 用 CI が残っていたが、実際の配信先はすでに Vercel へ変更済みとユーザーに確認した。
既存の [プロジェクト `elendia-network/blog-elendia-net`](https://vercel.com/elendia-network/blog-elendia-net) を使う。
設定変更はユーザーがダッシュボードで行う。

Vercel 上で記事取得と Lume の生成を行い、`_site/` を静的配信する。
Node.js はビルド時に使用し、このブログ用の常駐サーバーや Vercel Functions は必要としない。

| Vercel の設定           | 設定案                                          |
| ----------------------- | ----------------------------------------------- |
| 接続する Git リポジトリ | サイト側リポジトリへの既存の接続を確認          |
| Framework Preset        | `Other`                                         |
| Root Directory          | リポジトリのルート                              |
| Node.js Version         | `24.x`                                          |
| Install Command         | `npm ci`。`package-lock.json` を追跡する        |
| Build Command           | `npm run build`。記事の取得・検証・配置も含める |
| Output Directory        | `_site`                                         |
| Production Branch       | 既存設定を確認し、Preview 検証後に本番へ反映    |

Vercel はビルド環境に Git を含み、生成した出力ディレクトリを静的配信できる。 `package.json` の Node.js
指定はプロジェクト設定より優先されるため、開放範囲の `>=24` ではなく `24.x` を指定して開発環境とそろえる。 根拠:
[ビルド設定](https://vercel.com/docs/builds/configure-a-build)、
[ビルド環境](https://vercel.com/docs/builds/build-image)、
[Node.js バージョンの指定](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)。

記事リポジトリが未定の間は、Production / Preview で `MICROCMS_ENABLE=true` と既存の
`MICROCMS_SERVICE_DOMAIN`・`MICROCMS_API_KEY` を確認する。
記事リポジトリの決定後、その URL・取得対象 ref・必要な Git 認証を Vercel のビルド環境に設定する。サイト側の Git
連携だけで、別の非公開記事リポジトリも取得できるとは扱わない。 microCMS を併用する期間だけ、既存の CMS
環境変数も引き継ぐ。

更新時のビルドは、サイト側の push では Vercel の Git 連携、記事側の push では Deploy Hook を使う案とする。 Deploy Hook
はサイト側のブランチに紐づき、そのコードで記事の公開ブランチを再取得する。 記事コミットの固定やプレビューの扱いは
[記事リポジトリの設計案](./content-repository.md) を参照。

移行ブランチの Preview で、記事の直リンク・末尾スラッシュ・画像・タグ・フィードを確認してから本番へ反映する。
`blog.elendia.net` の既存ドメイン設定を利用し、本番反映後に HTTPS と記事の配信を確認する。
Deno Deploy 用の `.github/workflows/deploy.yml` と `serve.ts` は削除済み。
GitHub Actions は検証に使い、本番への配信は既存の Vercel 連携で行う。

## 記事のある状態で移行結果を検証する

1. `npm run build` が記事の取得・検証・配置を経て生成することを確認する。
2. 11 件以上のサンプル記事を用意し、トップの 10 件表示と `/posts/page/2/` を確認する。
3. `yyyy-MM-dd_slug.md` の記事で、公開 URL・日付・並び順が移行前と一致することを確認する。
   日本語タグのリンクも比較する。
4. Markdown の目次・脚注・属性・定義リスト・警告枠・名前付きコードブロック・埋め込みを確認する。 C#
   などの構文ハイライトと `/style.css`、`/components.css`、favicon の出力も確認する。
5. Git から取得した記事本文・タグ・日付・画像・一覧への反映を確認する。 microCMS を併用する場合は、取得元をまたいだ URL
   の重複も検証する。
6. `/posts.rss` と `/posts.json` の URL・件数・本文・日時を比較する。
   フィードの生成時刻など、毎回変わる値は比較から除く。
7. TypeScript の型検査とフォーマット・lint を、移行後に定義したコマンドで実行する。
8. 公開先のプレビューで直リンクと配信ファイルを確認してから本番へ切り替える。

`src/pages/_data.json` が存在しない `layouts/page.tsx` を参照している点は既存の不一致。
固定ページを検証対象に含める場合は、実在する `layouts/page.vto` に合わせる。

## 検証後に Deno 用の設定を整理する

- `package-lock.json` を追跡し、`.gitignore` に `node_modules/` と `_cache/` を追加する。
- npm scripts に開発用環境変数の読込・記事作成・型検査・書式確認の手順をそろえる。
- `.vscode/settings.json` の Deno 有効化と既定フォーマッターを移行後のツールに合わせる。
- ユーザー指定の Oxc に移行し、行幅 120 と記事・生成物の除外設定を引き継いだ。
- `deno.json` と `deno.lock` は削除済み。Deno は開発ツールとしても不要。
- README と AGENTS.md を、移行済みの依存関係・コマンド・公開先に更新する。

コード・依存関係・CI の変更は `feat/lume-v4-migration` にまとめる。
Vercel の Preview で検証してから本番へ反映する。v4 の Preview・本番での配信確認は未実施。

---

旧ビルドコマンド

```
curl -fsSL https://deno.land/x/install/install.sh | sh && /vercel/.deno/bin/deno task lume
```
