import {EditorView} from "@codemirror/view";
import {HighlightStyle, syntaxHighlighting} from "@codemirror/language";
import {tags as t} from "@lezer/highlight";

const c = {
  chalky: "#e5c07b",
  coral: "#e06c75",
  cyan: "#56b6c2",
  invalid: "#ffffff",
  ivory: "#abb2bf",
  stone: "#7d8799",
  malibu: "#61afef",
  sage: "#98c379",
  whiskey: "#d19a66",
  violet: "#c678dd",
  darkBackground: "#21252b",
  highlightBackground: "#2c313a",
  background: "#282c34",
  tooltipBackground: "#353a42",
  selection: "#3E4451",
  cursor: "#528bff"
};

export const editorTheme = EditorView.theme({
  "&": {
    color: c.ivory,
    backgroundColor: c.background,
  },

  ".cm-content": {
    caretColor: c.cursor,
  },

  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: c.cursor,
    borderLeftWidth: "2.5px", // Default is 1.2
    marginLeft: "-1.3px", // 2.5 - 1.2
    marginTop: "-3px",
    height: "25px !important",
  },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: c.selection
  },

  ".cm-panels": {backgroundColor: c.darkBackground, color: c.ivory},
  ".cm-panels.cm-panels-top": {borderBottom: "2px solid black"},
  ".cm-panels.cm-panels-bottom": {borderTop: "2px solid black"},

  ".cm-searchMatch": {
    backgroundColor: "#72a1ff59",
    outline: "1px solid #457dff"
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "#6199ff2f"
  },

  ".cm-activeLine": {backgroundColor: "#6699ff0b"},
  ".cm-selectionMatch": {backgroundColor: "#aafe661a"},

  "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
    backgroundColor: "#bad0f847"
  },

  ".cm-gutters": {
    backgroundColor: c.background,
    color: c.stone,
    border: "none"
  },

  ".cm-activeLineGutter": {
    backgroundColor: c.highlightBackground
  },

  ".cm-foldPlaceholder": {
    backgroundColor: "transparent",
    border: "none",
    color: "#ddd"
  },

  ".cm-tooltip": {
    border: "none",
    backgroundColor: c.tooltipBackground
  },
  ".cm-tooltip .cm-tooltip-arrow:before": {
    borderTopColor: "transparent",
    borderBottomColor: "transparent"
  },
  ".cm-tooltip .cm-tooltip-arrow:after": {
    borderTopColor: c.tooltipBackground,
    borderBottomColor: c.tooltipBackground
  },
  ".cm-tooltip-autocomplete": {
    "& > ul > li[aria-selected]": {
      backgroundColor: c.highlightBackground,
      color: c.ivory
    }
  }
}, {dark: true});

/// The highlighting style for code in the One Dark theme.
export const highlightStyle = syntaxHighlighting(HighlightStyle.define([
  {
    tag: [t.keyword],
    color: c.violet
  },
  {
    tag: [t.definitionKeyword, t.controlKeyword],
    color: c.coral
  },
  {
    tag: [t.function(t.variableName), t.labelName],
    color: c.malibu
  },
  {
    tag: [t.color, t.constant(t.name), t.standard(t.name)],
    color: c.whiskey
  },
  {
    tag: [t.definition(t.name), t.separator],
    color: c.ivory
  },
  {
    tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace],
    color: c.chalky
  },
  {
    tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)],
    color: c.cyan
  },
  {tag: [t.meta, t.comment], color: c.stone},
  {tag: [t.atom, t.bool, t.special(t.variableName)], color: c.whiskey },
  {tag: [t.processingInstruction, t.string, t.inserted], color: c.sage},
  {tag: t.invalid, color: c.invalid},
]));

export const editorStyle = [editorTheme, highlightStyle];
