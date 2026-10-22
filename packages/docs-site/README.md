# EasyFM documentation

Static Fumadocs site for EasyFM guides and the TypeScript API reference. The API page is
generated from the SDK source with `fumadocs-typescript`, so it shares the guide layout,
navigation, search, and theme.

```sh
pnpm docs:dev
pnpm docs:build
```

Guide content remains in the repository-level `docs/` directory. The static site exports
to `packages/docs-site/out/`.
