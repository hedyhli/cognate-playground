Test attempt at the actual interactive playground that is made of only static
files.

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
- tree-sitter-cognate.wasm -- build from tree-sitter-cognate
- index.html -- the entire app
