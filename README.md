The end goal is to make an online playground for the [Cognate programming
language](https://cognate-lang.github.io), using Elm.

The plan is to write tree-sitter grammar for Cognate, compile for WASM, then use
an Elm or JS-based interpreter to evaluate on top of the AST.

It might be possible to compile the original Cognate to WASM and use that as its
runtime, but as of right now Cognate lacks a tree-sitter grammar, so there's
that.
