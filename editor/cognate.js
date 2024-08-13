import { parser } from "./parser.js"
import { foldNodeProp, indentNodeProp } from "@codemirror/language"
import { LanguageSupport, LRLanguage, delimitedIndent } from "@codemirror/language"
import { styleTags, tags as t } from "@lezer/highlight"
import { completeFromList } from "@codemirror/autocomplete"

export const cognateLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      styleTags({
        // Identifier: t.variableName,
        "If When Unless For While Until": t.controlKeyword,
        "Def Let": t.definitionKeyword,
        "+ - \"*\" \"/\"": t.arithmeticOperator,
        "Modulo Sqrt": t.operatorKeyword,
        "And Not Or Xor": t.logicOperator,
        "> < == \"!=\" >= <=": t.compareOperator,
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
  autocomplete: completeFromList([
    { label: "Def", type: "keyword" },
    { label: "Let", type: "keyword" },
    { label: "For", type: "keyword" },
    { label: "Do", type: "keyword" },
    { label: "Print", type: "function" },
  ])
})

export function cognate() {
  return new LanguageSupport(cognateLanguage, [cognateCompletion])
}
