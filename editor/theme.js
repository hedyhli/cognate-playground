import {EditorView} from "@codemirror/view";
import {HighlightStyle, syntaxHighlighting} from "@codemirror/language";
import {tags as t} from "@lezer/highlight";

export const c = {
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
    fontFamily: "var(--sans-font)",
  },

  ".cm-content": {
    caretColor: "white",
  },

  ".cm-scroller": {
    fontFamily: "var(--mono-font)",
    lineHeight: "inherit",
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

  "& button": {
    color: c.ivory,
  },

  ".cm-tooltip": {
    backgroundColor: c.tooltipBackground,
    boxShadow: "2px 4px 15px #222529",
    color: c.ivory,
  },
  ".cm-tooltip .cm-tooltip-arrow:before": {
    borderTopColor: "transparent",
    borderBottomColor: "transparent"
  },
  ".cm-tooltip .cm-tooltip-arrow:after": {
    borderTopColor: c.tooltipBackground,
    borderBottomColor: c.tooltipBackground
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul": {
    fontFamily: "var(--mono-font)",
    "& > li": {
      padding: ".15rem .6rem",
    },
  },
  ".cm-tooltip-autocomplete": {
    "& > ul > li[aria-selected]": {
      backgroundColor: "#555d6c",
    }
  },
  ".cm-panel.cm-panel-lint ul [aria-selected]": {
    backgroundColor: "#555d6c",
  },
  ".cm-completionInfo.cm-completionInfo-right": {
    marginLeft: "5px",
  },
  ".cm-completionDetail": {
    float: "right",
    color: c.ivory,
  },
  ".cm-lint-marker-error": {
    content: 'url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' + encodeURIComponent('<path fill="#f87" d="M11,15H13V17H11V15M11,7H13V13H11V7M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20Z" />') + '</svg>\')',
    width: "1em",
    height: "1em",
    marginLeft: ".25em",
  },
  ".cm-lint-marker": {
  },
  ".cm-completionIcon-snippet": {
    "&::after": {
      content: "'{}'",
      marginLeft: '-.2rem',
    },
  },
  ".cm-diagnostic": {
    fontFamily: "var(--mono-font)",
    fontSize: ".9rem",
  },
  ".cm-diagnostic-error": {
    borderLeft: "2px #f87 solid",
    padding: ".3rem .8rem",
  },
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
