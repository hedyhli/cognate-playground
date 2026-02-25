import { CM, Linter } from './editor/editor.js';
import { Runner, setPreludeReady, initPrelude, initTS, mockFrontend } from './cognate.js';

import * as cmView from '@codemirror/view'
import { EditorView } from '@codemirror/view'
// import { EditorState } from '@codemirror/state';
import * as cmLanguage from '@codemirror/language';
import {HighlightStyle, syntaxHighlighting} from "@codemirror/language";
import * as cmCommands from '@codemirror/commands';
import * as cmSearch from '@codemirror/search';
import * as cmAutocomplete from '@codemirror/autocomplete';
import {tags as t} from "@lezer/highlight";
// import * as cmLint from '@codemirror/lint';

import { cognate } from './editor/cognate.js';
import { initIdent2kind } from './builtins.js';

const P = [];
let curOutput;
const R = new Runner({
  ...mockFrontend,
  output: {
    add(s) {
      curOutput.innerHTML += s.value;
    },
    clear() {
      curOutput.innerHTML = '';
    },
    newline() {
      curOutput.innerHTML += '\n';
    },
  },
});

initIdent2kind({});

const coreExtensions = [
  // cmLint.lintGutter(),
  // cmView.lineNumbers(),
  // cmView.highlightActiveLine(),
  // cmView.highlightActiveLineGutter(),
  cmView.highlightSpecialChars(),
  cmView.dropCursor(),

  cmCommands.history(),

  // cmLanguage.foldGutter(),
  cmLanguage.indentOnInput(),
  cmLanguage.bracketMatching(),

  cmAutocomplete.closeBrackets(),
  // cmAutocomplete.autocompletion({ closeOnBlur: true }),

  cmView.keymap.of([
    ...cmAutocomplete.closeBracketsKeymap,
    ...cmCommands.defaultKeymap,
    ...cmSearch.searchKeymap,
    ...cmCommands.historyKeymap,
    ...cmLanguage.foldKeymap,
    ...cmAutocomplete.completionKeymap,
  ]),
];

initTS().then(() => setPreludeReady()).catch((e) => console.error(e));

function handleChange(playground, newText) {
  R.tree = undefined;
  curOutput = playground.$output;
  R.run(newText);
}

document.querySelectorAll("div.code").forEach((parent, i) => {
  // pre.playground
  let block = parent.querySelector(".playground");
  let text = block.innerText;
  block.innerHTML = "";
  let res = document.createElement("pre");
  res.classList.add("output");
  parent.appendChild(res);
  P.push({
    view: new EditorView({
      doc: text,
      extensions: [
        coreExtensions,
        cognate(),
        EditorView.theme({}, {dark: false}),
        syntaxHighlighting(HighlightStyle.define([
          {tag: [t.comment, t.blockComment, t.meta], color: "#aaa"},
          {tag: [t.number], color: "#0086b3"},
          {tag: [t.string], color: "#183691"},
        ], {themeType: "light"})),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            handleChange(P[i], update.state.doc.toString());
          }
        }),
      ],
      parent: block,
    }),
    $output: res,
  });
});
