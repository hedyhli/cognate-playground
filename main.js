// NOTE: This seems to produce wasm related errors:
// import TreeSitter from 'web-tree-sitter';
// import TSCognateURL from './public/tree-sitter-cognate.wasm?url';
// import PreludeURL from './prelude.cog?url'
import './base.css';

import { CM, Linter } from './editor/editor.js';
import { Runner, setPreludeReady, initPrelude, initTS, escape } from './cognate.js';

const $selectExample = document.getElementById("select-example");
const $output = document.getElementById("output");
const $externalError = document.getElementById("external-error");
const $externalErrorBox = document.getElementById("external-error-box");
const $noticeDismiss = document.getElementById("notice-dismiss");
const $outputError = document.getElementById("output-error");
const $errorsContainer = document.getElementById("errors-container");
const $debugContainer = document.getElementById("debug-container");
const $outputContainer = document.getElementById("output-container");
const $outputDebug = document.getElementById("output-debug");

const STORAGE_KEY = "cognate-playground";

const Store = {
  getInput: () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').custom || 'Print "Hello, world!";',
  saveInput: (newInput) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ custom: newInput }));
  },
};

const App = {
  // The select preset
  selectionChange: false,
  preludeLines: [],
  runner: null,
  fetchPrelude: () => {
    fetch("prelude.cog")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`The server returned status ${res.status}${res.statusText ? ": " + res.statusText : ''}.`);
        }
        return res.text();
      })
      .then((text) => {
        App.preludeLines = text.split('\n');
        initPrelude(text);
      })
      .catch((e) => {
        $externalErrorBox.classList.remove("hidden");
        $externalError.innerHTML = `<p>Unable to fetch prelude file! ${e.message}</p><p>You can continue to use the playground normally, but built-in functions defined in the prelude will not be available.</p>`;
      }).finally(() => {
        setPreludeReady();
        App.runner.run(Store.getInput());
        App.postRun();
      });
  },
  postRun: () => {
    if ($output.innerHTML == '') {
      $outputContainer.classList.add("hidden");
    } else {
      $outputContainer.classList.remove("hidden");
    }
    if ($outputDebug.innerHTML == '') {
      $debugContainer.classList.add("hidden");
    } else {
      $debugContainer.classList.remove("hidden");
    }
  },
  init: async () => {
    await initTS();
    App.runner = new Runner({
      output: Output,
      errors: {
        add(e) {
          Errors.push(e);
        },
        clear() {
          Errors = [];
        },
        redraw(heading) {
          redrawErrors(heading);
        },
        hasAny: () => Errors.length > 0,
      },
      diagnostics: {
        add(...args) {
          Linter.addDiagnostic(...args);
        },
        clear() {
          Linter.diagnostics = [];
        },
      },
      style: {
        marked: (s) => textMarked(s),
        light: (s) => textLight(s),
      },
      editor: CM,
      store: Store,
      $stack: $outputDebug,
    });
    CM.setup(
      Store.getInput(),
      document.getElementById("input"),
      (update) => {
        if (update.docChanged) {
          // Don't update Store if the code input changed due to a <select> change.
          let shouldRedraw = false;
          let changes = [];
          update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
            if (fromA != fromB || toA != toB || inserted.length != 0) {
              shouldRedraw = true;
            }
            changes.push([fromA, toA, fromB, toB, inserted])
          })

          if (shouldRedraw) {
            changes.forEach((info) => {
              App.runner.tree.edit(CM.change2tsEdit(update.startState, update.state, ...info));
            });
            // TODO: Do it in a worker thread or some other asynchronous way to
            // prevent blocking view updates.
            App.runner.run(update.state.doc.toString(), !App.selectionChange);
            App.postRun();
            App.selectionChange = false;
          }
        }
      }
    );
    $selectExample.value = "custom";
    App.fetchPrelude();
  },
};

const Output = {
  clear: () => { $output.innerHTML = "" },
  add: (str) => {
    $output.innerHTML += str.style ? `<span style='${str.style}'>${escape(str.value)}</span>` : escape(str.value);
  },
  newline: () => {
    $output.innerHTML += "\n";
  }
};

let Errors = [];

function redrawErrors(heading) {
  if (Errors.length != 0) {
    let html = '';
    if (heading) {
      html += `<p>${heading}</p>`;
    }
    html += "<ol>";
    html += Errors.map((item) => `<li>${item}</li>`).join("");
    html += "</ol>";
    $outputError.innerHTML = html;
    $errorsContainer.classList.remove("hidden");
  } else {
    $outputError.innerHTML = '';
    $errorsContainer.classList.add("hidden");
  }
}

const ExamplePresets = {
  custom: ``,
  hanoi: `Def Move discs as (
	Let N be the Number! of discs;
	Let A be the first rod;
	Let B be the second rod;
	Let C be the third rod;

	Unless Zero? N (
		Move - 1 N discs from A via C to B;
		Prints ("disc " N " : " A " --> " C);
		Move - 1 N discs from B via A to C;
	)
);

Move 3 discs from \\X via \\Y to \\Z;`,
  fizzbuzz: `Def Fizzbuzz (
	Let N be the current Number!;
	Def Multiple as ( Zero? Modulo Swap N );
	Print
		If Multiple of 15 then "fizzbuzz"
		If Multiple of 3  then "fizz"
		If Multiple of 5  then "buzz"
		   else N
);

For each in Range 1 to 100 ( Fizzbuzz );`,
  primes: `Def Factor (Zero? Modulo Swap);

Def Primes (
	Let U be the upper bound Number!;
	initialize an Empty list;
	For Range 2 to U (
		Let I be our potential prime;
		Let Primes are the found primes;
		Let To-check be Take-while (<= Sqrt I) Primes;
		When None (Factor of I) To-check
			(Append List (I)) to Primes;
	)
);

Print Primes up to 100;`,
  fib: `Def Fib
	Case (< 3) then (1 Drop)
	else (Let N ; Fib of - 1 N ; + Fib of - 2 N);

Put "The 20th fibonacci number is: ";
Print Fib 20;`,
  numbers: `~~ Numbers are what you expect. Both integers
~~ and floats are supported.

Print 0;
Print 0.2;
Put "1 + 2 = ";
Print + 1 2;

Put "(1 + 2) * 3 = ";
Print * 3 + 1 2;

Put "10 Modulo 3 = ";
Print Modulo 3 10;

Put "Sqrt 4 = ";
Print Sqrt 4;`,
  variables: `~~ Variables in cognate are bound using Let.
Let N 0;
Print N;

~~ Variables are immutable.
Let N 1;`,
  strings: `~~ String literals are denoted by ""
Let A "apples + banana + peanuts";
Put "First:    \\t";
Print First A;

Put "Rest:    \\t";
Print Rest A;

Put "Substring: \\t";
~~ Ranges are inclusive on both ends.
Print Substring 0 4 A;

Print "\\nSplitting by the plus sign:";
Put "we get a list: \\t";
Print Split " + " A;

Print "\\nConverting a character to and from its UTF16 code:";
Print Character Ordinal "A";

~~ String escape sequences:
~~ \\b, \\t, \\n, \\r, \\", \\v, \\\\
~~ ...are supported. A backslash followed by a
~~ character other than any of these will be
~~ treated literally.
~~
~~ You can see string escape sequences in action
~~ above.
~~
~~ Note that '\\a' that is supported by CognaC,
~~ is not supported here in the playground.

Print "\\nConverting between cases:";
Print Uppercase "ÀḅḈɗe";
Print Lowercase "ÀḅḈƊE";
`,
  blocks: `~~ Blocks are denoted with (). They will not
~~ be evaluated until you call Do.

(Print "hi");
Drop;

Do (Print "hi 2");

They can also be bound to functions, calling them
won't require 'Do'.`,
  functions: `~~ Define functions using Def.
~~ Def works similarly to Let, except they must be
~~ bound to a block.

Def Hello ( Print "hello!" );

~~ Call a function by writing its name directly.
~~ There's no need to call Do.

Hello;`,
  lists: `~~ Lists in Cognate are constructed using
~~ the List function, which takes a block, evaluates
~~ it, then collects the remaining items in the stack
~~ into a list.

Print List (1; 2; 3; 4; 5);
Print List (1 2 3 4 5);

Print "\\nShow strings literally when in a list:";
Print List ("1 2 \\t 3 \\n 4");

~~ Some useful list functions;
Print Index 4 List (0 1 2 3 4);
Print First of List (0 1 2);
Print Rest of List (0 1 2);
Print Length of List (0 1 2);

~~ Notice how Length is used for both strings and lists.
`,
};

function textLight(text) {
  return `<span style='color: var(--text-light)'>${text}</span>`;
}

function textMarked(text) {
  return `<span style='color: var(--marked)'>${text}</span>`;
}

//////////////////////////////////////////////////////////////////////

$selectExample.addEventListener("change", function () {
  let key = $selectExample.value;
  let newContent = key == "custom" ? Store.getInput() : ExamplePresets[key];
  App.selectionChange = true;
  CM.setText(newContent);
});

$noticeDismiss.addEventListener("click", function () {
  $externalErrorBox.classList.add("hidden");
});

App.init().then(() => {}).catch(err => { console.error(err) });
