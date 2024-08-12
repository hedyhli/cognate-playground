# Cognate Playground

The goal is to build an interactive playground that remains fully client-side
(i.e., rather than simply calling the official Cognate CLI in a sandboxed
environment).

<img src="https://raw.githubusercontent.com/hedyhli/cognate-playground/main/demo.png" width=800 />

It currently supports all types except Box, Dict, and I/O, and about 95% of all
builtins from the C prelude.

[Tree-sitter](https://github.com/hedyhli/tree-sitter-cognate) is used as the
parser, and the the runtime written entirely in JavaScript.

Files
- index.html -- the entire app
- tree-sitter.js, tree-sitter.wasm -- from tree-sitter releases
- tree-sitter-cognate.wasm -- built from
  [tree-sitter-cognate](https://github.com/hedyhli/tree-sitter-cognate)
- prelude.cog -- definitions of various built-in functions. copied from the
  Cognate repo with only I/O builtins commented out. eventually it will simply
  link to the prelude.cog file from the Cognate repo.

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
- [X] Fix `Print`; Add `Show`
- [X] Update Prelude from upstream
- [X] Add `Stack`
- [ ] Add string methods
- [ ] Support `Box` and a proper `Set`
- [ ] String escape sequences
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
