Test attempt at the actual interactive playground that remains fully
client-side.

<img src="https://raw.githubusercontent.com/hedyhli/cognate-playground/main/test/demo.png" width=800/>

It can currently:
- Print output
- Handle parsing errors
- Define variables, somewhat

It cannot currently:
- Handle runtime errors
- Reference variables when defining new variables
- Handle `def_stmt`

Also, I'm aware that I'm treating it like a shell (`<fn> <arguments ...>`)
rather than a stack-based language, but we'll get there. Soon!

See `example.cog` for what it is capable of right now.

Files
- tree-sitter.js, tree-sitter.wasm -- from tree-sitter releases
- tree-sitter-cognate.wasm -- built from tree-sitter-cognate
- index.html -- the entire app

References
- <https://tree-sitter.github.io/tree-sitter/playground>
- <https://github.com/tree-sitter/tree-sitter/blob/master/docs/assets/js/playground.js>
- <https://github.com/tree-sitter/tree-sitter/blob/master/lib/binding_web/tree-sitter-web.d.ts>
- <https://github.com/gleam-lang/language-tour/blob/main/static/worker.js>
