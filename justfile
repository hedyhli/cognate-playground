default:
  @just -l

deploy:
  rsync -rv prelude.cog index.html tree-sitter* pgs.sh:/cognate-playground

up:
  python3 -m http.server

wasm:
  cp ../tree-sitter-cognate/tree-sitter-cognate.wasm .

prelude:
  cp ../cognate/src/prelude.cog .
