# Cognate Playground

The goal is to build an interactive playground that remains fully client-side
(i.e., rather than simply calling the official Cognate CLI in a sandboxed
environment).

<img src="https://raw.githubusercontent.com/hedyhli/cognate-playground/main/demo.png" width=800 />

It currently supports variables, functions, as well as subset of built-in
functions (such as While loops) defined in `prelude.cog`.

Take a look at `example.cog` for an overview of what it is capable right now.

Files
- tree-sitter.js, tree-sitter.wasm -- from tree-sitter releases
- tree-sitter-cognate.wasm -- built from
  [tree-sitter-cognate](https://github.com/hedyhli/tree-sitter-cognate)
- elm directory -- contains an elm stack-calculator app that I made in
  preparation for this project (initially intending to use elm), which is now
  kept for posterity.
- index.html -- the entire app (for now!)
- prelude.cog -- definitions of various built-in functions. copied from the
  Cognate repo with features that aren't yet supported commented out. eventually
  it will simply link to the prelude.cog file from the Cognate repo.

It can currently walk the tree provided by tree-sitter, and produce a useful
stack for the program.

### Todo

Implementation
- [X] Working interpreter
- [X] Escape HTML
- [X] Proper "types"
- [X] Scoping
- [X] Support symbols and floats
- [X] Support `Set` (temporarily) to update values from outer scope
- [X] Function shadowing
- [X] Fix lexical scoping
- [X] Support `List`
- [X] Support hoisting
- [X] Allow shadowing things in the prelude and builtins
- [ ] Fix `Print`; Add `Show`
- [ ] Update Prelude from upstream
- [ ] Add `Stack`
- [ ] Add string methods
- [ ] Support `Box` and a proper `Set`
- [ ] Prevent stack overflows
- [ ] Optimizations on the stack before parsing
- [ ] Consider feasibility of transpiling to JS
- [ ] Standard library coverage
- [X] Closures
- [ ] Tests

Others
- [X] Presets of example code
- [X] Save input in localstorage
- [ ] Live syntax highlighting with tree-sitter
- [ ] More informative errors (with token span info from tree-sitter)

### References
- <https://tree-sitter.github.io/tree-sitter/playground>
- <https://github.com/tree-sitter/tree-sitter/blob/master/docs/assets/js/playground.js>
- <https://github.com/tree-sitter/tree-sitter/blob/master/lib/binding_web/tree-sitter-web.d.ts>
- <https://github.com/gleam-lang/language-tour/blob/main/static/worker.js>
