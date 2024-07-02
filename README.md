The end goal is to make an online playground for the [Cognate programming
language](https://cognate-lang.github.io), using Elm.

Ideas

The official Cognate implementation compiles Cognate to C, then to an
executable. This doesn't seem very useful if we want everything to run in the
frontend. So we'll probably use the [tree-sitter grammar for
Cognate](https://github.com/hedyhli/tree-sitter-cognate) as a parser, loaded as
WASM.

Here are two approaches.

- Interpreter
  1. Tree-sitter parser
  1. Walk the tree and evaluate like an interpreter.

- Compile to JS
  Similar to what the Gleam interactive tutorial does:
  <https://github.com/gleam-lang/language-tour/blob/970c3b6e00c12edd8cf68793673b5da0a2ca4255/static/worker.js>

  This approach seems to require less overhead than the other one, whilst
  benefiting the ecosystem as a whole (allowing us to write Cognate and compile
  it to JS).

  1. Tree-sitter parser
  1. Walk the tree, compile to JS
  1. Run the JS directly
