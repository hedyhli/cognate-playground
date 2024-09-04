# Cognate Playground

[![Checks](https://github.com/hedyhli/cognate-playground/actions/workflows/checks.yml/badge.svg)](https://github.com/hedyhli/cognate-playground/actions/workflows/checks.yml)

Canonical instance: <https://cognate-playground.hedy.dev/>

An interactive playground for [Cognate](https://cognate-lang.github.io) that
uses a JavaScript implementation of Cognate.

<img src="https://raw.githubusercontent.com/hedyhli/cognate-playground/main/screenshot.png" width=800 />

It currently supports about 90% of all builtins from the C prelude, and all
types except Table and IO. Discrepancies of this implementation that can be
illustrated by tests can be found with `XFAIL` markers in the tests directory.

Files of interest
- index.html
- cognate.js -- the parser, linter, and runtime
- main.js -- the rest of the app excluding the editor
- `editor/*` -- code relating to the editor component
- `public/tree-sitter.{js,wasm}` -- from tree-sitter releases
- `public/tree-sitter-cognate.wasm` -- built from
  [tree-sitter-cognate](https://github.com/hedyhli/tree-sitter-cognate)
- `public/prelude.cog` -- definitions of various built-in functions. copied from the
  Cognate repo with only I/O builtins commented out. eventually it will simply
  link to the prelude.cog file from the Cognate repo.

### Todo

The runtime and cognate implementation
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
- [ ] Explore optimization options, consider feasibility of transpiling to JS or using bytecode
- [X] Standard library coverage
- [X] Closures
- [X] Tests
- [ ] Consider using something like decimal.js for floating point precision
- [ ] Mock I/O
- [ ] Table

The Playground
- [X] Presets of example code
- [X] Save input in localstorage
- [X] Live syntax highlighting
- [X] [perf] Collect all tokens to be highlighted, and dispatch them in batch
- [X] [perf] Avoid re-evaluating the prelude each time
- [X] [perf] Send edits to tree-sitter instead
- [ ] Use worker thread for the runtime
- [ ] Allow stopping current execution with a button
- [ ] Auto-eval after a timeout, merging several successive edits in one
- [X] (1) Highlight references of functions in scope
- [X] Show parser errors inline in the editor
- [ ] More informative runtime errors
  - [ ] Format the traceback similar to Python (or Web Console)
  - [ ] Collapse recursive calls and show surrounding code(?)
  - [ ] Clicks on symbols can navigate to the definition/reference in the editor
- [X] Fix (1); highlight with static analysis rather than at runtime
- [ ] [perf] Find ways to accurately cache for (1)
- [X] Handle failure to fetch prelude
- [X] Fix tree-sitter edit conversions for pair wrapping (editor feature)
- [ ] Editor settings
  - [ ] Tooltip hints
  - [ ] Autocomplete
  - [ ] Tab handling
  - [ ] Auto eval - if not, show a `Run` button
- [ ] Lint for possible missing semicolons
- [ ] Special function, (or just `Print`) that allows exploring data structures
  interactively (similar to the Web Console) - but retain cognac behaviour with
  `Show`