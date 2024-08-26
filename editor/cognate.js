import { completions as cognateBuiltins, ident2kind, normalizeIdentifier, Docs } from "../builtins.js"
import { parser } from "./parser.js"

import { hoverTooltip } from "@codemirror/view"
import { foldNodeProp, indentNodeProp, syntaxTree } from "@codemirror/language"
import { LanguageSupport, LRLanguage, delimitedIndent } from "@codemirror/language"
import { styleTags, tags as t } from "@lezer/highlight"

export const cognateLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      styleTags({
        // Identifier: t.variableName,
        Boolean: t.bool,
        String: t.string,
        StringEscape: t.escape,
        Number: t.number,
        LineComment: t.lineComment,
        "( )": t.paren,
        Symbol: t.keyword,
        ";": t.punctuation,
        InlineComment: t.meta,
        MultilineComment: t.meta,
      }),
      indentNodeProp.add({
        Block: delimitedIndent({ closing: ")", align: false })
      }),
      foldNodeProp.add({
        Block (tree) { return { from: tree.from + 1, to: tree.to - 1 } },
        MultilineComment (tree) { return { from: tree.from + 1, to: tree.to - 1 } },
      })
    ]
  }),
  languageData: {
    closeBrackets: { brackets: ["(", '"'] },
    commentTokens: { line: "~~", block: {open: "~", close: "~"} },
  }
})

export const cognateCompletion = cognateLanguage.data.of({
  autocomplete: (context) => {
    let token = context.tokenBefore(["Identifier"]);
    if (token) {
      if (token.from == token.to && !context.explicit)
        return null
      return {
        from: token.from,
        options: cognateBuiltins.filter((item) => item.label.startsWith(token.text[0])),
      }
    }
  }
})

const charHelp = {
  '(': "<strong>Left parenthesis</strong> begins a block. <strong>Blocks</strong> introduce new scope; Cognate supports both <a href=\"https://en.wikipedia.org/wiki/Variable_shadowing\">variable shadowing</a> and JavaScript-style <a href=\"https://en.wikipedia.org/wiki/Variable_hoisting\">hoisting</a>.",
  ')': "<strong>Right parenthesis</strong> is the closing delimiter of a block.",
  ';': "<strong>Semicolon</strong> marks the end of a statement. Items are pushed onto the stack in reverse of the order they're written in a statement.",
};

const nodeHelp = {
  "StringEscape": "<strong>String escape sequences</strong> can be shown literally when printing a list of strings.",
  "Number": "<strong>Numbers</strong> include integers and floats. Math errors may be thrown in some functions that work with numbers, such as dividing by zero.",
  "Symbol": "<strong>Symbols</strong> are printed literally, they can be compared and are case-insensitive like identifiers.",
  "String": "<strong>String literals</strong> are delimited by double quotes. They can be escaped with a backslash.",
  "InlineComment": "Words starting with a lowercase letter are treated as comments. This lets you write statements that read like English sentences.",
  "Identifier": "<strong>Identifiers</strong> are case-insensitive. The first letter must be upper-case to be distinguished from an inline comment.",
}

const hoverSymbol = hoverTooltip((view, pos, side) => {
  let tree = syntaxTree(view.state);
  if (!tree)
    return null

  let char = view.state.sliceDoc(pos, pos+1);
  if (charHelp[char]) {
    return {
      pos: pos,
      end: pos + 1,
      create(_view) {
        let dom = document.createElement("div");
        dom.classList.add("hover-symbol");
        dom.innerHTML = charHelp[char];
        return {dom};
      }
    };
  }

  let node = tree.resolve(pos, 0);
  if (node.name != "Identifier") {
    if (['String', 'StringEscape', 'Boolean', 'Symbol', 'Number', 'InlineComment'].includes(node.name))
      return {
        pos: node.from,
        end: node.to,
        create(_view) {
          let dom = document.createElement("div");
          dom.classList.add("hover-symbol");
          dom.innerHTML = nodeHelp[node.name] || node.name;
          return {dom};
        }
      };
    else
      return null;
  }

  let word = normalizeIdentifier(view.state.sliceDoc(node.from, node.to));

  return {
    pos: node.from,
    end: node.to,
    above: ident2kind[word] != undefined,
    create(_view) {
      let dom = document.createElement("div");
      dom.classList.add("hover-symbol");
      dom.innerHTML = Docs[word] ? Docs[word] : ((ident2kind[word] ? `Built-in function <strong>${word}</strong><br><br>` : '') + nodeHelp.Identifier);
      return {dom};
    }
  };
});

export function cognate() {
  return new LanguageSupport(cognateLanguage, [cognateCompletion, hoverSymbol])
}
