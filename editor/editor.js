import * as cmView from '@codemirror/view'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state';
import * as cmLanguage from '@codemirror/language';
import * as cmCommands from '@codemirror/commands';
import * as cmSearch from '@codemirror/search';
import * as cmAutocomplete from '@codemirror/autocomplete';
// import * as cmLint from '@codemirror/lint';

import { cognate } from './cognate.js'
import { editorStyle, c as colors } from './theme.js'

let view;

import {StateField, StateEffect} from "@codemirror/state"
import {Decoration} from "@codemirror/view"

const addMarks = StateEffect.define();
const filterMarks = StateEffect.define();

const markFieldExtension = StateField.define({
  create() { return Decoration.none },

  update(value, tr) {
    // Move the decorations to account for document changes
    value = value.map(tr.changes)
    // If this transaction adds or removes decorations, apply those changes
    for (let effect of tr.effects) {
      if (effect.is(addMarks))
        value = value.update({add: effect.value, sort: true});
      else if (effect.is(filterMarks))
        value = value.update({filter: effect.value});
    }
    return value;
  },

  // Indicate that this field provides a set of decorations
  provide: f => EditorView.decorations.from(f)
})

const coreExtensions = [
    cmView.lineNumbers(),
    cmView.highlightActiveLine(), cmView.highlightActiveLineGutter(),
    cmView.highlightSpecialChars(),
    cmView.dropCursor(),
    cmView.crosshairCursor(),
    cmView.rectangularSelection(),
    cmView.drawSelection(),
    EditorState.allowMultipleSelections.of(true),

    cmCommands.history(),

    cmLanguage.foldGutter(),
    cmLanguage.indentOnInput(),
    cmLanguage.bracketMatching(),

    cmAutocomplete.closeBrackets(),
    cmAutocomplete.autocompletion(),

    cmSearch.highlightSelectionMatches(),

    cmView.keymap.of([
        ...cmAutocomplete.closeBracketsKeymap,
        ...cmCommands.defaultKeymap,
        ...cmSearch.searchKeymap,
        ...cmCommands.historyKeymap,
        ...cmLanguage.foldKeymap,
        ...cmAutocomplete.completionKeymap,
        // ...cmLint.lintKeymap
    ]),

  markFieldExtension,
];

const markKinds = {
  keyword: Decoration.mark({
    attributes: { style: `color: ${colors.coral}` },
  }),
  builtin: Decoration.mark({
    attributes: { style: `color: ${colors.whiskey}` },
  }),
  function: Decoration.mark({
    attributes: { style: `color: ${colors.malibu}` },
  }),
  operator: Decoration.mark({
    attributes: { style: `color: ${colors.cyan}` },
  }),
};

const CM = {
  setup: (initialText, element, listener) => {
    view = new EditorView({
      doc: initialText,
      extensions: [
        coreExtensions,
        cognate(),
        editorStyle,
        EditorView.updateListener.of(listener),
      ],
      parent: element,
    });
  },
  setText: (newContent) => {
    view.dispatch(view.state.update({
      changes: {from: 0, to: view.state.doc.length, insert: newContent}
    }));
  },
  // Note that node is a tree-sitter node
  setMark: (node, kind) => {
    view.dispatch({
      effects: addMarks.of([ markKinds[kind].range(node.startIndex, node.endIndex) ]),
    });
  },
};

export default CM;