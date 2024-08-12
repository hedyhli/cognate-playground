default:
  @just -l

deploy:
  pnpm build
  rsync -rv dist/* pgs.sh:/cognate-playground

up:
  pnpm dev

wasm:
  cp ../tree-sitter-cognate/tree-sitter-cognate.wasm .

prelude:
  cp ../cognate/src/prelude.cog .
