# blog.elendia.net

aiwas' weblog powered by [Lume](https://github.com/lumeland/lume)

## Technologies

- [Deno](https://deno.com)
- [Lume](https://lume.land/)
- [jenil/chota](https://github.com/jenil/chota)

### Dependencies

- [valeriangalliat/markdown-it-anchor](https://github.com/valeriangalliat/markdown-it-anchor)
- [markdown-it/markdown-it-abbr](https://github.com/markdown-it/markdown-it-abbr)
- [markdown-it/markdown-it-sub](https://github.com/markdown-it/markdown-it-sub)
- [markdown-it/markdown-it-sup](https://github.com/markdown-it/markdown-it-sup)
- [markdown-it/markdown-it-footnote](https://github.com/markdown-it/markdown-it-footnote)
- [cmaas/markdown-it-table-of-contents](https://github.com/cmaas/markdown-it-table-of-contents)
- [markdown-it/markdown-it-container](https://github.com/markdown-it/markdown-it-container)
- [tsutsu3/markdown-it-named-code-blocks](https://github.com/tsutsu3/markdown-it-named-code-blocks)
- [rotorz/markdown-it-block-embed](https://github.com/rotorz/markdown-it-block-embed)
- markdown-it-attr (by default)
- markdown-it-deflist (by default)

## NOTE

### When some cache is missing:

To reload all dependencies, run `deno cache _config.ts`

### Using environmental variables:

- in development: Read from `.env.production`.
- in production (Deno Deploy, Vercel and others): Use Environmental Variables Settings of each platform.

## Deployment

### microCMS -> Vercel (directly)

1. Select `Vercel > (Project) > Settings > Deploy Hooks` and issue webhook url
2. Select `microCMS > (API) > API設定 > Webhook > カスタム通知` and add incoming webhook setting

### microCMS -> Github Actions -> Vercel

- Maybe better than above?
  - If using headless CMS (i.e. not storing article data in git repo), there is no need to use GitHub Actions.
