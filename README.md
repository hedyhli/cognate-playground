# Cognate Playground

The goal is to build an interactive playground that remains fully client-side
(i.e., rather than simply calling the official Cognate CLI in a sandboxed
environment).

<img src="https://raw.githubusercontent.com/hedyhli/cognate-playground/main/demo.png" width=800/>

It currently supports defining variables and functions, as well as subset of
built-in functions for now.

Files
- tree-sitter.js, tree-sitter.wasm -- from tree-sitter releases
- tree-sitter-cognate.wasm -- built from
  [tree-sitter-cognate](https://github.com/hedyhli/tree-sitter-cognate)
- elm directory -- contains an elm stack-calculator app that I made in
  preparation for this project (initially intending to use elm), which is now
  kept for posterity.
- index.html -- the entire app (for now!)

It can currently walk the tree provided by tree-sitter, and produce a useful
stack for the program.

Todo
- [X] Working interpreter
- [ ] Optimizations on the stack (such as flattening when `Do` encountered)
- [ ] Proper "types"
- [ ] Adapt the justfile
- [ ] More informative errors (with token span info from tree-sitter)
- [ ] Support symbols and floats
- [ ] Consider feasibility of transpiling to JS
- [ ] Support `List`
- [ ] Support `Box`
- [ ] Better standard library coverage
- [ ] Closures and edge cases
- [ ] Tests

References
- <https://tree-sitter.github.io/tree-sitter/playground>
- <https://github.com/tree-sitter/tree-sitter/blob/master/docs/assets/js/playground.js>
- <https://github.com/tree-sitter/tree-sitter/blob/master/lib/binding_web/tree-sitter-web.d.ts>
- <https://github.com/gleam-lang/language-tour/blob/main/static/worker.js>
