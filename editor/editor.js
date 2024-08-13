import * as cmView from '@codemirror/view'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state';
import * as cmLanguage from '@codemirror/language';
import * as cmCommands from '@codemirror/commands';
import * as cmSearch from '@codemirror/search';
import * as cmAutocomplete from '@codemirror/autocomplete';
// import * as cmLint from '@codemirror/lint';

import { cognate } from './cognate.js'
import { editorStyle } from './theme.js'

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
    ])
];

let view;

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
  }
}

export default CM;
