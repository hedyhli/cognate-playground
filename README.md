# Cognate Playground

[![Checks](https://github.com/hedyhli/cognate-playground/actions/workflows/checks.yml/badge.svg)](https://github.com/hedyhli/cognate-playground/actions/workflows/checks.yml)

Canonical instance: <https://cognate-playground.hedy.dev/>

An interactive playground for [Cognate](https://cognate-lang.github.io) that
remains completely client-side.

<img src="https://raw.githubusercontent.com/hedyhli/cognate-playground/main/demo.png" width=800 />

It currently supports about 80% of all builtins from the C prelude, and all
types except Dict and IO.

[Tree-sitter](https://github.com/hedyhli/tree-sitter-cognate) is used as the
parser and the runtime is written entirely in JavaScript.

Files of interest
- index.html
- cognate.js -- the interpreter and runtime
- main.js -- the rest of the app excluding the editor
- `editor/*` -- code relating to the editor component
- `public/tree-sitter.{js,wasm}` -- from tree-sitter releases
- `public/tree-sitter-cognate.wasm` -- built from
  [tree-sitter-cognate](https://github.com/hedyhli/tree-sitter-cognate)
- `public/prelude.cog` -- definitions of various built-in functions. copied from the
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
- [X] Add string methods
- [X] Support `Box` and a proper `Set`
- [X] String escape sequences
- [X] Prevent stack overflows
- [ ] Optimizations on the stack before parsing
- [ ] Consider feasibility of transpiling to JS or use bytecode
- [X] Standard library coverage
- [X] Closures
- [X] Tests
- [ ] Consider using something like decimal.js for floating point precision

Others
- [X] Presets of example code
- [X] Save input in localstorage
- [X] Live syntax highlighting
- [X] [perf] Collect all tokens to be highlighted, and dispatch them in batch
- [X] [perf] Avoid re-evaluating the prelude each time
- [X] [perf] Send edits to tree-sitter instead
- [ ] [perf] Consider using a worker thread for `redraw`, or some other way
      to prevent blocking input, such as merging several successive edits in
      one, or implementing a `Run` button.
- [X] (1) Highlight references of functions in scope
- [X] Show parser errors inline in the editor
- [ ] More informative runtime errors
- [X] Fix (1); highlight with static analysis rather than at runtime
- [ ] [perf] Find ways to accurately cache for (1)
- [X] Handle failure to fetch prelude
- [X] Fix tree-sitter edit conversions for pair wrapping (editor feature)
- [ ] Editor settings
