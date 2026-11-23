# AGENTS.md

このリポジトリで作業するコーディングエージェント向けの指示。
実行するコマンドは `package.json` を読み、既存スクリプトの処理を重複して実行しない。

## Node.js と Lume v4 でブログを生成する

- Node.js 24、TypeScript、Lume v4 を使用する。`.node-version` と `package.json` に実行環境を指定。
- Vento（`.vto`）と SSX（`.tsx`）でビルド時に HTML を生成する。
- スタイルは Sass と chota、構文ハイライトは Prism。Tailwind / PostCSS は使わない。
- 記事は別の非公開 Git リポジトリからビルド時に取得する。接続先は未定。
- microCMS は記事の Git 移行が終わるまで併用する。
- 配信先は既存の [Vercel プロジェクト `elendia-network/blog-elendia-net`](https://vercel.com/elendia-network/blog-elendia-net)。
  設定変更はユーザーがダッシュボードで行う。v4 のデプロイ確認は未実施。
- 依存関係は `package.json` と `package-lock.json` で管理し、インストールは `npm ci`。
- Deno の実行環境・開発ツールには依存しない。

## 変更する場所を選ぶ

| パス                                          | 役割                                                                         |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `_config.ts`                                  | Lume の入出力、プラグイン、アセット、HTML の後処理、保存前のエラー・重複検査 |
| `_markdown.ts`                                | Markdown の拡張設定                                                          |
| `_helper.ts`                                  | Vento の toot / youtube フィルターと旧タグ記法の互換処理                     |
| `_feed.ts`                                    | 最新 10 件の記事から RSS / JSON Feed を生成                                  |
| `lib/content.ts`                              | 記事の Git 取得、検証、配置、同期記録                                        |
| `lib/date.ts`                                 | 東京時間での日付表示                                                         |
| `scripts/build.ts` / `scripts/render.ts`      | 記事同期と生成の起動 / 生成失敗を終了コードに反映                            |
| `scripts/git-askpass.mjs`                     | HTTPS の Git 認証。実行権限を保つ                                            |
| `scripts/new-post.ts`                         | 編集用の記事リポジトリへ下書きを作成                                         |
| `src/index.page.tsx` / `src/tags.page.tsx`    | トップ / タグ一覧                                                            |
| `src/posts.page.ts` / `src/tag.page.ts`       | 記事一覧のページ送り / タグ別記事一覧                                        |
| `src/microcms.page.ts`                        | 移行期間中の microCMS 記事取得                                               |
| `src/_includes/layouts/` / `src/_components/` | 共通レイアウト / 再利用する部品                                              |
| `src/_data/`                                  | サイトのメタ情報とプロフィール                                               |
| `src/posts/_data.json`                        | 記事のレイアウト・種別・変換順の既定値                                       |
| `src/style.scss` / `src/_includes/scss/`      | スタイルの入口 / 本文・埋め込み・ハイライト                                  |
| `tests/`                                      | Git 同期、記事生成、microCMS モックのテスト                                  |
| `.github/workflows/ci.yml`                    | npm ci、書式・lint・型検査、テスト、ビルド                                   |
| `vercel.json`                                 | Vercel の静的配信設定                                                        |
| `_site/` / `_cache/` / `_content/`            | 生成物 / キャッシュ / 取得・配置作業と同期記録。Git 除外対象                 |

## npm スクリプトで開発・検証する

| コマンド                                  | 用途                                       |
| ----------------------------------------- | ------------------------------------------ |
| `npm run build`                           | 記事を同期し、エラーがなければサイトを生成 |
| `npm run serve`                           | 記事を同期して開発サーバーを起動           |
| `npm run build:dev` / `npm run serve:dev` | `.env.development` を読み込んで実行        |
| `npm run content:sync`                    | 記事の同期だけを実行                       |
| `npm run content:new -- slug "タイトル"`  | `CONTENT_DIR` に下書きを作成               |
| `npm run check`                           | TypeScript の型検査                        |
| `npm test`                                | 一時リポジトリと生成物を使ったテスト       |
| `npm run lint`                            | Oxlint。警告も失敗として扱う               |
| `npm run fmt:check` / `npm run fmt`       | Oxfmt による書式確認 / 整形                |

`build` は型検査やテストを含まない。TypeScript / テンプレート / スタイルを変更したら、
書式・lint・型検査・テスト・ビルドを確認する。
記事なしのビルドだけで、記事本文やページ送りを検証済みと判断しない。
ページ生成のテストは 11 件以上の記事・画像・旧形式の日付付き記事・埋め込み・フィードを扱う。
変更した機能に応じて開発サーバーでも対象ページを確認する。

## 記事と認証情報を扱う

- 記事は `posts/{slug}/index.md` と `assets/`。公開日時はタイムゾーン付きの front matter に記録。
- 公開 URL は `/posts/{slug}/`。既存記事の URL を維持する。
- `CONTENT_DIR` は編集用リポジトリのルート。指定時はリモート取得より優先する。
- リモート取得には `CONTENT_REPOSITORY` と `CONTENT_REF` が必要。
  HTTPS トークン認証では `CONTENT_GIT_USERNAME` と `CONTENT_GIT_TOKEN` も指定する。
- トークンを URL、ログ、Git、文書へ埋め込まない。`.env.example` は変数名だけの見本。
- 配置した記事を直接編集しない。同期処理は `_content/synced-posts.json` で管理対象を判断する。
- 管理対象外の記事との衝突はエラー。`src/posts/_data.json` と手元の記事を無断で削除しない。
- 公開ビルドでは下書きの本文と画像をまとめて除外する。
  ローカル確認には `CONTENT_INCLUDE_DRAFTS=true` を指定できる。
- microCMS は `MICROCMS_ENABLE=true` の場合だけ有効。
  `MICROCMS_SERVICE_DOMAIN` と `MICROCMS_API_KEY` が必要。
- Vercel では Git 記事と microCMS がどちらも未設定だとビルドを失敗させる。
- 記事側の push はサイト側の Git 連携だけでは反映されない。Deploy Hook の設定は接続先決定後に行う。

## 実装と書式を合わせる

- ページは `.page.tsx`。レイアウトと直接 import する部品は `.tsx` のまま使う。
- JSX は `@lumeland/ssx`、型は `Lume.Data` や `@lumeland/core/types.ts` を使う。
- Lume 管理の Vento コンポーネントは `comp` から呼ぶ。非同期の描画に注意する。
- Sass の入口は `site.add("style.scss")` で明示し、コンポーネント CSS は `/components.css` に出力。
- 日付の表示は `Asia/Tokyo`。公開日時と Git の取得日時を混同しない。
- 書式は Oxfmt、静的解析は Oxlint。2 スペース、ダブルクォート、セミコロン付き、行幅 120。
- `.vto` と記事 Markdown は Oxfmt 対象外。Vento の既存書式は手作業で維持する。
- 未確定の運用事項はユーザーに確認する。現在の計画と進捗は `docs/` と README に記録する。

## ファイル操作とコミットの規約

- 検索は `rg` / `rg --files` を優先する。
- 作成・編集には専用の Write / Edit ツールを使う。利用できない環境では専用の `apply_patch` を使う。
- Bash 経由の Python スクリプト、`sed`、`cat` でファイルを作成・編集しない。
- 出力を過度に削らず、簡潔なレポーターがあれば使う。
- コミットは `<type>(<scope>): <日本語の簡潔な概要>` の Conventional Commits 形式。
- type は `feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`chore`。
- 無関係な変更を混ぜず、最小単位に分ける。
- 過去のコミットを編集する場合は、内容を明示してユーザーの許可を得る。
