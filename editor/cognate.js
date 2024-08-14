import { completions as cognateBuiltins } from "../builtins.js"
import { parser } from "./parser.js"

import { foldNodeProp, indentNodeProp } from "@codemirror/language"
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
        options: cognateBuiltins,
      }
    }
  }
})

export function cognate() {
  return new LanguageSupport(cognateLanguage, [cognateCompletion])
}
