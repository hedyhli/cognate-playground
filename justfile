default:
  @just -l

deploy:
  pnpm lezer
  pnpm build
  tar -C dist -cvz . > site.tgz
  hut pages publish --protocol HTTPS -d cognate-playground.hedy.dev site.tgz

up:
  pnpm dev

wasm:
  cp ../tree-sitter-cognate/tree-sitter-cognate.wasm ./public/

prelude:
  cp ../cognate/src/prelude.cog ./public/
