# blog.elendia.net

Forest of Elendia のソースコード。Node.js 24、Lume v4、TypeScript、Vento / SSX、Sass、Prism を使う。
Vercel で記事を取得・生成し、`_site/` を静的配信する構成。

## 開発する

```sh
npm ci
npm run build
npm run serve
```

`serve` は通常 http://localhost:3000/ で起動する。
環境変数ファイルを使う場合は `.env.example` を `.env.development` にコピーして、
`npm run serve:dev` または `npm run build:dev` を実行する。

| コマンド                                     | 用途                                                      |
| -------------------------------------------- | --------------------------------------------------------- |
| `npm run build`                              | 記事の取得・検証・配置とサイト生成                        |
| `npm run serve`                              | 記事を配置して開発サーバーを起動                          |
| `npm run content:sync`                       | 記事とアセットの取得・検証・配置だけを実行                |
| `npm run content:new -- slug "記事タイトル"` | `CONTENT_DIR` に下書き記事を作成                          |
| `npm run check`                              | TypeScript の型検査                                       |
| `npm test`                                   | 一時 Git リポジトリでの同期と、記事入りサイト生成のテスト |
| `npm run lint`                               | Oxlint による静的解析                                     |
| `npm run fmt:check`                          | Oxfmt による書式確認                                      |
| `npm run fmt`                                | 対応ファイルの書式を整える                                |

Oxfmt は行幅 120。Vento の `.vto` は対象外とし、既存の書式を維持する。
Node.js に移行済みで、Deno のインストールは不要。

## 別リポジトリの記事を使う

記事リポジトリの構成:

```text
posts/
  example-post/
    index.md
    assets/
      cover.webp
```

`index.md` の例:

```markdown
---
title: 記事タイトル
date: 2026-11-20T10:00:00+09:00
url: /posts/example-post/
tags:
  - TypeScript
draft: false
---

![画像の説明](./assets/cover.webp)
```

公開日時はタイムゾーン付きで必須。URL は `/posts/{ディレクトリ名}/` と一致させる。
記事のレイアウト、種別、Vento → Markdown の処理順はサイト側の `src/posts/_data.json` で定義する。
JPG・JPEG・PNG・GIF・WebP・AVIF・SVG・PDF をアセットとして扱う。

ローカルの記事を編集する場合:

```sh
CONTENT_DIR=/path/to/articles npm run serve
CONTENT_DIR=/path/to/articles npm run content:new -- example-post "記事タイトル"
CONTENT_DIR=/path/to/articles CONTENT_INCLUDE_DRAFTS=true npm run serve
```

`CONTENT_DIR` は `posts/` の親ディレクトリを指定し、設定されていればリモートの取得より優先する。
記事は起動時に同期する。編集後は別のターミナルで同じ `CONTENT_DIR` を指定して
`npm run content:sync` を実行するか、開発サーバーを再起動する。
公開用の配置先 `src/posts/` を直接編集しない。

Git から取得する場合は、次の環境変数を設定する。

| 変数                   | 内容                                           |
| ---------------------- | ---------------------------------------------- |
| `CONTENT_REPOSITORY`   | 記事リポジトリの HTTPS URL。認証情報を含めない |
| `CONTENT_REF`          | 取得するブランチ・タグ・コミット ID。省略不可  |
| `CONTENT_GIT_USERNAME` | Git ホストがトークン認証で要求するユーザー名   |
| `CONTENT_GIT_TOKEN`    | 記事リポジトリだけを読み取れるトークン         |

認証は Git の askpass 経由で渡す。Git ホストによって要求するユーザー名が異なるため、接続先の仕様に合わせる。
ホスティング先・URL・公開用ブランチは未定。

取得した記事と画像を検証してから配置する。公開用ビルドでは下書きとそのアセットを配置しない。
管理対象は `_content/synced-posts.json` に記録し、同期時には削除された記事も反映する。
管理対象外の記事との衝突はエラーにし、`_data.json` は保持する。
同期記録を消した状態で配置先だけ残すと、上書き防止のエラーになる。

サイトと記事のコミット ID はビルドログと同期記録で確認できる。
ローカル編集の場合は記事コミットを記録せず、作業中のファイルを使う。

## microCMS を移行中も使う

Git への記事移行が終わるまで microCMS を併用できる。

- `MICROCMS_ENABLE=true`
- `MICROCMS_SERVICE_DOMAIN`
- `MICROCMS_API_KEY`

`blog-article` の記事を取得して生成する。Git の記事と同じ公開パスになった場合はビルドを失敗させる。
実際の CMS との接続確認・記事のエクスポートは別途必要。
テストではモック応答で SDK と生成処理を確認する。

## Vercel へ配信する

既存の [Vercel プロジェクト `elendia-network/blog-elendia-net`](https://vercel.com/elendia-network/blog-elendia-net) を使う。
設定変更はユーザーがダッシュボードで行う。次の値を確認する。

| 設定             | 値                 |
| ---------------- | ------------------ |
| Framework Preset | `Other`            |
| Root Directory   | リポジトリのルート |
| Node.js Version  | `24.x`             |
| Install Command  | `npm ci`           |
| Build Command    | `npm run build`    |
| Output Directory | `_site`            |

Framework・インストール・ビルド・出力先は `vercel.json` に定義済みで、ダッシュボードの設定より優先される。
Node.js は `package.json` の `engines.node` でも `24.x` を指定している。根拠:
[構成ファイル](https://vercel.com/docs/project-configuration/vercel-json)、
[Node.js のバージョン指定](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)。

記事リポジトリが未定の間は、Environment Variables の Production / Preview それぞれで
`MICROCMS_ENABLE=true`、`MICROCMS_SERVICE_DOMAIN`、`MICROCMS_API_KEY` を確認する。
既存の値を引き継ぎ、キーやトークンをコード・チャットへ記載しない。

記事の Git 設定と読み取りトークンは Vercel の Environment Variables に設定する。
Git 記事と microCMS が両方未設定の Vercel ビルドは失敗する。
`CONTENT_DIR` はローカル開発用なので Vercel では設定しない。
`CONTENT_INCLUDE_DRAFTS` と `LUME_DRAFTS` は未設定か `false` にする。
Vercel 上での下書き出力は Preview も含めて許可していない。

移行ブランチの Preview で、microCMS の記事取得・記事の直リンク・画像・タグ・フィードを確認してから本番へ反映する。
既存のドメイン設定を利用する。v4 の Vercel ビルドと配信の確認は未実施。

サイト側の push は Vercel の Git 連携からビルドする。
記事側の公開ブランチへの push は、記事側の CI などからサイト側の Deploy Hook を呼ぶ。
Hook URL を記事側の秘密情報として保存し、コードへ記録しない。
Hook は取得コミットを渡す仕組みではないため、通常はビルド時点の公開ブランチを取得する。

GitHub Actions は型検査・Oxc・テスト・ローカル記事でのビルドだけを行う。
Deno Deploy 向けの配信処理は削除済み。

背景と未確定事項は [v4 移行計画](docs/lume-v4-migration.md) と
[記事リポジトリの設計](docs/content-repository.md) を参照。
