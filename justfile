default:
  @just -l

deploy:
  pnpm build
  tar -C dist -cvz . > site.tgz
  hut pages publish --protocol HTTPS -d cognate-playground.hedy.dev site.tgz

up:
  pnpm dev

wasm:
  cp ../tree-sitter-cognate/tree-sitter-cognate.wasm .

prelude:
  cp ../cognate/src/prelude.cog .
