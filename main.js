// NOTE: This seems to produce wasm related errors:
// import TreeSitter from 'web-tree-sitter';
// import TSCognateURL from './public/tree-sitter-cognate.wasm?url';
// import PreludeURL from './prelude.cog?url'
import './simple.min.css';

import { CM, Linter } from './editor/editor.js';
import { ident2kind, Builtins, initIdent2kind, normalizeIdentifier, value2object } from './builtins.js';

const $selectExample = document.getElementById("select-example")
const $output = document.getElementById("output")
const $outputError = document.getElementById("output-error")
const $outputDebug = document.getElementById("output-debug")

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
  tree: null,
  prelude: '',
  preludeEnv: {},
  fetchPrelude: () => {
    // TODO: Error message on failure.
    fetch("prelude.cog")
      .then((res) => res.text())
      .then((text) => {
        App.prelude = text;
        execPrelude();
        initIdent2kind(App.preludeEnv);
        redraw(Store.getInput());
      })
      .catch((e) => console.error(e));
  },
  ts: {
    parser: undefined,
    init: async () => {
      await TreeSitter.init()
      const parser = new TreeSitter();
      const Cognate = await TreeSitter.Language.load("tree-sitter-cognate.wasm");
      parser.setLanguage(Cognate);
      App.ts.parser = parser;
    },
  },
  init: async () => {
    await App.ts.init();
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
              App.tree.edit(CM.change2tsEdit(update.startState, update.state, ...info));
            });
            // TODO: Do it in a worker thread or some other asynchronous way to
            // prevent blocking view updates.
            redraw(update.state.doc.toString(), !App.selectionChange);
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

function appendError(message) {
  Errors.push(message);
}

function redrawErrors() {
  let html = textLight("None!");
  if (Errors.length != 0) {
    html = "<ol>";
    html += Errors.map((item) => `<li>${item}</li>`).join("");
    html += "</ol>";
  }
  $outputError.innerHTML = html;
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
  numbers: `~~ Numbers
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
Put "Head:    \\t";
Print Head A;

Put "Tail:    \\t";
Print Tail A;

Put "Substring: \\t";
~~ Ranges are inclusive on both ends.
Print Substring 0 4 A;

Print "\\nSplitting by the plus sign:";
Put "we get a list: \\t";
Print Split " + " A;

Print "\\nConverting a character to and from its UTF16 code:";
Print Character Ordinal "A";

~~ String escape sequences:
~~ \\a, \\b, \\t, \\n, \\r, \\", \\v, \\\\
~~ ...are supported. A backslash followed by a
~~ character other than any of these will be
~~ treated literally.
~~
~~ You can see string escape sequences in action
~~ above.

Print "\\nShow strings literally using Show:";
Print Show "1 2 \\t 3 \\n 4";
`,
  blocks: `~~ Blocks are denoted with (). They will not
~~ be evaluated until you call Do.

(Print "hi");
Drop;

Do (Print "hi 2");`,
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
~~ into a list.`,
};

// Taken from lodash
function escape(string) {
  const htmlEscapes = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
  };
  const reUnescapedHtml = /[&<>"']/g;
  const reHasUnescapedHtml = RegExp(reUnescapedHtml.source);

  return string && reHasUnescapedHtml.test(string)
        ? string.replace(reUnescapedHtml, (chr) => htmlEscapes[chr])
        : string || '';
}

const Style = {
  marked: 'color: var(--marked)',
  light: 'color: var(--text-light)',
};

function textLight(text) {
  return `<span style='color: var(--text-light)'>${text}</span>`;
}

function textMarked(text) {
  return `<span style='color: var(--marked)'>${text}</span>`;
}

const stringEscapes = {a: '\a', b: '\b', t: '\t', n: '\n', v: '\v', f: '\f', r: '\r', '"': '"', '\\': '\\'};
const stringEscapesReverse = {'\a': '\\a', '\b': '\\b', '\t': '\\t', '\n': '\\n', '\v': '\\v', '\f': '\\f', '\r': '\\r', '"': '\\"', '\\': '\\\\'};

const node2object = {
  number: (node, userCode) => ({
    type: 'number',
    value: Number.parseFloat(node.text),
    node: node,
    userCode: userCode,
  }),
  string: (node, s, userCode) => ({
    type: 'string',
    value: s.slice(1, s.length-1),
    node: node,
    userCode: userCode,
  }),
  boolean: (node, userCode) => ({
    type: 'boolean',
    value: (node.text.toLowerCase() == 'true'),
    node: node,
    userCode: userCode,
  }),
  identifier: (node, userCode) => ({
    type: 'identifier',
    value: normalizeIdentifier(node.text),
    node: node,
    userCode: userCode,
  }),
  symbol: (node, userCode) => ({
    type: 'symbol',
    value: node.text.slice(1).toLowerCase(),
    node: node,
    userCode: userCode,
  }),
  block: (body, predec, userCode, parent) => ({
    type: 'block',
    body: body,
    env: { parent: parent ? parent.env : undefined },
    predeclares: predec,
    userCode: userCode,
    parent: parent,
  }),
};

// TODO: No longer necessary.
const bindObject = {
  number: (predec, number) => { predec.type = 'number'; predec.value = number.value },
  string: (predec, string) => { predec.type = 'string'; predec.value = string.value },
  boolean: (predec, boolean) => { predec.type = 'boolean'; predec.value = boolean.value },
  symbol: (predec, symbol) => { predec.type = 'symbol'; predec.value = symbol.value },
  function: (predec, block) => {
    predec.type = 'function';
    predec.block = block;
  },
  block: (predec, block) => {
    predec.type = 'block';
    predec.body = block.body;
    predec.env = block.env;
    predec.predeclares = block.predeclares;
  },
  list: (predec, list) => { predec.type = 'list'; predec.list = list.list },
};

function execPrelude() {
  if (App.ts.parser == undefined || App.prelude == '') {
    return;
  }

  // Parse
  const preludeTree = App.ts.parser.parse(App.prelude);
  Errors = [];
  App.preludeEnv = {};
  let result = parse(preludeTree);
  redrawErrors();
  if (result.bail) {
    $outputError.innerHTML = "<p>Error when parsing the prelude!</p>" + $outputError.innerHTML;
    return
  }
  App.preludeEnv = result.rootBlock.env;
  App.preludeEnv.parent = undefined;
  // Exec
  result = process(result.rootBlock, [], true);
  if (result.error != '') {
    appendError(result.error);
    redrawErrors();
    $outputDebug.innerHTML = _printArr(result.stack);
    $outputError.innerHTML = "<p>Parsing of prelude failed!</p>" + $outputError.innerHTML;
    return;
  }
}

function redraw(code, edited) {
  if (App.ts.parser == undefined || App.prelude == '') {
    return;
  }

  console.log("------");
  Errors = [];
  Linter.diagnostics = [];
  Output.clear();

  // Parse
  App.tree = App.ts.parser.parse(code, App.tree);
  let result = parse(App.tree, true);
  analyzeBlock(result.rootBlock);
  let rootBlock = { env: App.preludeEnv }
  CM.applyMarks(true);
  redrawErrors();
  if (result.bail || Errors.length != 0) {
    $outputError.innerHTML = "<p>Error during parsing!</p>" + $outputError.innerHTML;
  } else {
    result.rootBlock.parent = rootBlock;
    result.rootBlock.env.parent = App.preludeEnv;
    // Exec
    result = process(result.rootBlock, [], false);
    $outputDebug.innerHTML = _printArr(result.stack);
    if (result.error != '') {
      appendError(result.error);
      redrawErrors();
      $outputError.innerHTML = "<p>Runtime error!</p>" + $outputError.innerHTML;
    }
  }

  // Save input after process finishes to prevent inability to exit potential
  // loop where program cannot terminate without editing source code.
  if (edited)
    Store.saveInput(code);
}

// Return a string representation of a nested array, with each root element on
// another line.
function printArr(arr) {
  return arr.map((item) => (item.type == 'block') ? _printArr(item.body) : _repr(item)).join("\n");
}

// Represent a stack in a single line.
function _printArr(arr) {
  let output = "";

  const iter = (item, i) => {
    if (item.type == 'block') {
      output += "[";
      if (item.body.length > 0) {
        item.body.forEach(iter);
        output = output.slice(0, output.length-2);
      }
      output += "], ";
    } else {
      output += `${_repr(item)}, `;
    }
  };
  arr.forEach(iter);

  return `[${output.slice(0, output.length-2)}]`;
}

// Object to string for displaying the stack & debugging
function _repr(item) {
  switch (item.type) {
    case 'identifier':
      return escape(item.value);
    case 'number':
      return item.value;
    case 'boolean':
      return textMarked(item.value ? 'True' : 'False');
    case 'string':
      return `"${escape(item.value)}"`;
    case 'symbol':
      return `\\${escape(item.value)}`;
    case 'list':
      return "(" + [...item.list].reverse().map(_repr).join(", ") + ")"
    default:
      return textLight(`(unknown item of type ${textMarked(escape(item.type))})`);
  }
}

function rawStringify(str) {
  let chars = str.split('');
  let raw = chars.map((char) => stringEscapesReverse[char] || char).join('');
  return '"' + raw + '"';
}

// Object to string for the output
function resolve(item, quotedString) {
  if (item == undefined) {
    return undefined;
  }

  switch (item.type) {
    case 'block':
      return value2object.string('(block)', Style.marked);
    case 'string': {
      if (item.style) // This string is already styled by Show/resolve()
        return item;
      if (quotedString) {
        // convert back string escapes
        return value2object.string(rawStringify(item.value));
      }
      // Otherwise, fall through
    }
    case 'number':
      return value2object.string(item.value.toString());
    case 'symbol':
      return value2object.string(item.value);
    case 'boolean':
      return value2object.string(item.value ? 'True' : 'False', Style.marked);
    case 'list':
      /// XXX: Does not support unknown item type within the map call.
      return value2object.string(`(${[...item.list].reverse().map(item => resolve(item, true).value).join(', ')})`);
      // TODO: This can't be used with `Show` because it should
      // return a single string object and it can't currently supported
      // styling of different segments.
      //
      // let output = [value2object.string("(")];
      // [...item.list].reverse().forEach((item) => {
      //   output.push(resolve(item));
      //   output.push(value2object.string(", "));
      // })
      // output.pop();
      // output.push(value2object.string(")"));
      // return output;
    default:
      return {
        error: `unknown item of type ${textMarked(escape(item.type))}, value ${textMarked(escape(item))}`
      };
  }
}

// Parse a syntax tree into a nested block to be processed, flattening
// statement items in reverse order as per how Cognate operates the stack
// within statements.
//
// The entire program has a root "block" representing the outer scope.
function parse(tree, userCode) {
  const root = tree.rootNode;
  let bail = false;

  let rootBlock = node2object.block([], {}, userCode);

  function inner(node, currentBlock) {
    let inStmt = false;
    let inBlock = false;

    let name;
    if (node.isMissing) {
      name = `MISSING ${node.type}`;
      appendError(`missing: ${textMarked(node.type)} ` + textLight(`(${node.startPosition.row}, ${node.startPosition.column})`));
      bail = true;
      return;
    } else if (node.isNamed) {
      name = node.type;
    } else {
      return;
    }

    if (name.endsWith("_comment")) {
      return;
    }

    if (name == "ERROR") {
      if (node.text != '') {
        appendError(
          `unexpected token: '${textMarked(node.text)}' ` + textLight(`(${node.startPosition.row}, ${node.startPosition.column})`)
        );
        Linter.addDiagnostic(node, "error", "unexpected token");
      }
      else {
        appendError("syntax error " + textLight(`(${node.startPosition.row}, ${node.startPosition.column})`));
        Linter.addDiagnostic(node, "error", "syntax error");
      }
      bail = true;
      return;
    }

    switch (name) {
      case "block":
        inBlock = true;
        currentBlock.body.push(node2object.block([], {}, userCode, currentBlock));
        break;
      case "statement":
        inStmt = true;
        // XXX:
        // Shouldn't this "pseudo" block use only its block?
        // why doesn't the parent get referenced if it's not provided here?
        currentBlock.body.push(node2object.block([], currentBlock.predeclares, userCode));
        break;
      case "identifier":
        if (userCode) {
          if (ident2kind[node.text]) {
            CM.addMark(node, ident2kind[node.text]);
          }
        }
      case "number":
      case "boolean":
      case "symbol":
        currentBlock.body.push(node2object[name](node, userCode));
        break;
      case "string": {
        let str = node.text;
        let finalStr = '';
        if (node.children.length != 0) {
          let start = 0;
          for (let child of node.children) {
            // XXX: nodes of other types ignored?
            if (child.type == 'escape_sequence') {
              let esc = child.text.substr(1);
              let startIndex = child.startPosition.column - node.startPosition.column;
              finalStr += str.substr(start, startIndex - start);
              finalStr += stringEscapes[esc];
              start = startIndex + 2;
            }
          }
          finalStr += str.substr(start);
        } else {
          finalStr = str;
        }
        currentBlock.body.push(node2object.string(node, finalStr, userCode));
        break;
      }
      case "source_file":
        break;
      default:
        if (!name.startsWith("MISSING")) {
          appendError(`INTERNAL ERROR: unknown token type ${textMarked(name)} from tree-sitter!`);
          bail = true;
          return;
        }
    }

    if (inStmt) {
      let pushto = currentBlock.body[currentBlock.body.length-1];
      node.children.forEach((child, c) => inner(child, pushto));

      let stmt = currentBlock.body.pop();
      for(let i = stmt.body.length-1; i>=0; i--) {
        let item = stmt.body[i];
        let previous = stmt.body[i+1];
        if (item.type == 'identifier') {
          if (['Def', 'Let'].includes(item.value)) {
            if (!(previous && previous.type == 'identifier')) {
              appendError(`syntax error: identifier expected after ${item.value}`);
              Linter.addDiagnostic(item.node, "error", `syntax error: identifier expected after ${item.value}`);
              bail = true;
              return;
            } else {
              if (currentBlock.predeclares[previous.value]) {
                appendError(`${item.value} ${textMarked(previous.value)}: cannot shadow in the same block`);;
                Linter.addDiagnostic(previous.node, "error", "cannot shadow in the same block");
                bail = true;
              } else {
                currentBlock.predeclares[previous.value] = item.value;
              }
            }
          }
        } else if (item.type == 'block') {
          item.parent = currentBlock;
          item.env.parent = currentBlock.env;
        }
        currentBlock.body.push(item);
        previous = item;
      }

    } else if (inBlock) {
      let pushto = currentBlock.body[currentBlock.body.length-1];
      node.children.forEach((child, c) => inner(child, pushto));

    } else if (node.type == 'source_file') {
      node.children.forEach((child, c) => inner(child, currentBlock));

    } else {
      // XXX: nodes of other types ignored?
    }
  }

  inner(root, rootBlock);
  return { rootBlock: rootBlock, bail: bail }
}

function analyzeBlock(currentBlock) {
  let bail = false;
  for (let item of currentBlock.body) {
    if (bail) {
      return;
    }
    if (item.type == 'identifier' && ident2kind[item.value] == undefined) {
      let foundDecl = false;
      let block = currentBlock;
      while (block) {
        // TODO
        // PERF: find ways to cache
        if (block.predeclares[item.value] == 'Let') {
          foundDecl = true;
          break;
        } else if (block.predeclares[item.value] == 'Def') {
          foundDecl = true;
          CM.addMark(item.node, "function");
          break;
        }
        block = block.parent;
      }
      if (!foundDecl) {
        appendError(`undefined symbol ${textMarked(escape(item.value))}`);
        Linter.addDiagnostic(item.node, "error", "undefined symbol");
      }
    } else if (item.type == 'block') {
      analyzeBlock(item);
    }
  }
}


// Execute a block within a possibly `scoped` environment, with an initial
// stack `op`.
function process(/*readonly*/ currentBlock, op, modifyEnv) {
  let env = modifyEnv ? currentBlock.env : {parent: currentBlock.env.parent};
  let error = "";

  function getVar(item) {
    if (item.type == 'identifier') {
      let e = env;
      while (e) {
        let value = e[item.value];

        if (value != undefined) {
          if (value.type == '_predeclared') {
            error = `${textMarked(item.value)} used before declaration`;
            Linter.addDiagnostic(item.node, "error", "variable used before declaration");
            return undefined;
          }
          return value;
        }
        e = e.parent;
      }
      // Should not happen, since these are already checked in analyzeBlock
      // error = `undefined symbol ${textMarked(escape(item.value))}`;
      // Linter.addDiagnostic(item.node, "error", "undefined symbol");
      // return undefined;
      return undefined;
    } else {
      return item;
    }
  }

  function exists(item, kind) {
    if (item == undefined) {
      error = `expected ${kind}`;
      return undefined;
    }
    return item;
  }

  function expect(item, type) {
    if (item == undefined) {
      return undefined;
    }
    if (type == 'any' || item.type == type) {
      return item;
    }
    error = `expected ${type}, got ${item.type}`;
    return undefined;
  }

  function handleBuiltin(fnName) {
    const {params, returns, fn} = Builtins[fnName];
    let args = [];
    for(let i = 0; i < params.length; i++) {
      let param = params[i];
      let arg = expect(exists(op.pop(), param.name), param.type);
      if (arg == undefined) {
        return undefined;
      }
      args.push(arg);
    }
    let ret = fn(...args);
    // NOTE: fn must not return undefined.
    // Either return
    // - a JS object with error field, or
    // - a value suitable for value2object[returns field]
    if (ret.error != undefined) {
      error = `in ${textMarked(fnName)}: ` + ret.error;
      return undefined;
    }
    if (returns !== null) {
      op.push(ret.type == returns ? ret : value2object[returns](ret));
    }
  }

  // Predeclare names
  for (let name of Object.keys(currentBlock.predeclares)) {
    env[name] = { type: '_predeclared' };
  }

  // Execute the block
  for (let s = 0; s < currentBlock.body.length; s++) {
    let item = currentBlock.body[s];
    let next = currentBlock.body[s+1];

    if (error != "") {
      break;
    }

    switch (item.type) {
      case 'block': {
        // XXX:
        // Def M (
        //   Def P;
        //   Let N;
        //   Print N;
        //   P;
        //   Do If == N 0
        //     then ()
        //     else (M (P) - 1 N);
        // );
        // M (Print "in P") 3;
        op.push({
          type: 'block',
          body: item.body,
          env: { ...item.env, parent: env },
          predeclares: item.predeclares
        });
        break;
      }
      case 'identifier':
        if (next != undefined && next.type == 'identifier') {
          if (['Def', 'Let', 'Set'].includes(next.value)) {
            op.push(item);
            continue;
          }
        }
        {
          let fn = getVar(item);
          if (fn && fn.type == 'function') {
            let call_result = process(fn.block, op, false);
            if (call_result.error != "") {
              error = `in ${textMarked(item.value)}: ${call_result.error}`;
              break;
            }
            op = call_result.stack;
            continue;
          }
        }
        switch (item.value) {
          // Binding
          case 'Def': {
            // This check is technically done already during parsing.
            let a = expect(exists(op.pop(), 'identifier'), 'identifier');
            if (a == undefined) {
              error = `in ${textMarked('Def')}: ${error}`;
              break;
            }
            let b = expect(exists(op.pop(), `function body`), 'block');
            if (b == undefined) {
              error = `in ${textMarked('Def')}: ${error}`;
              break;
            }
            bindObject.function(env[a.value], b);
            break;
          }
          case 'Let': {
            let a = expect(exists(op.pop(), 'identifier'), 'identifier');
            if (a == undefined) {
              error = `in ${textMarked('Let')}: ${error}`;
              break;
            }
            let b = op.pop();
            if (b == undefined) {
              error = `in ${textMarked('Let')}: expected value to set`;
              break;
            }
            bindObject[b.type](env[a.value], b);
            break;
          }

          // Blocks
          case 'List': {
            let block = expect(exists(op.pop(), 'block'), 'block');
            if (block == undefined) {
              error = `in ${textMarked('List')}: ${error}`;
              break;
            }

            let list = [];
            let result = process(block, list, false);
            if (result.error != "") {
              error = `in ${textMarked('List')}: ${result.error}`;
              break;
            }
            op.push(value2object.list(list));
            break;
          }

          // Stack
          case 'Stack': {
            let list = [...op];
            op.push(value2object.list(list));
            break;
          }
          case 'Clear': {
            while (op.length > 0) {
              op.pop();
            }
            break;
          }

          // I/O
          case 'Show': {
            let item = exists(op.pop(), 'value');
            let str = resolve(item, false);
            if (str != undefined) {
              op.push(str);
            }
            break;
          }
          case 'Print': {
            let item = exists(op.pop(), 'value');
            let str = resolve(item, false);
            if (str != undefined) {
              Output.add(str);
              Output.newline();
            } else {
              error = `in ${textMarked('Print')}: ${error}`
            }
            break;
          }
          case 'Put': {
            let item = exists(op.pop(), 'value');
            let str = resolve(item, false);
            if (str != undefined) {
              Output.add(str);
            } else {
              error = `in ${textMarked('Print')}: ${error}`
            }
            break;
          }

          // Types
          case 'Number?':
          case 'String?':
          case 'Symbol?':
          case 'Block?':
          case 'List?':
          case 'Boolean?': {
            let a = exists(op[op.length-1], 'value');
            let type = item.value.slice(0, item.value.length-1).toLowerCase();
            if (a != undefined)
              op.push(value2object.boolean(a.type == type));
            else
              error = `in ${textMarked(item.value)}: ${error}`;
            break;
          }
          case 'Number!':
          case 'Symbol!':
          case 'String!':
          case 'Block!':
          case 'List!':
          case 'Boolean!': {
            let a = exists(op[op.length-1], 'value');
            let type = item.value.slice(0, item.value.length-1).toLowerCase();
            if (a != undefined && a.type != type)
              error = `in ${textMarked(item.value)}: ${type} assertion failed`
            break;
          }

          default: {
            if (Builtins[item.value]) {
              // TODO: Allow shadowing builtins and preludes
              handleBuiltin(item.value);
              break;
            } else {
              let a = getVar(item);
              if (a != undefined) {
                op.push(a);
              } else {
                // Should not happen, since undefined symbols are caught in `analyzeBlock`
              }
            }
            break;
          }
        };
        break;
      default:
        op.push(item);
        break;
    };
  }

  return {stack: op, error: error};
}

//////////////////////////////////////////////////////////////////////

$selectExample.addEventListener("change", function () {
  let key = $selectExample.value;
  let newContent = key == "custom" ? Store.getInput() : ExamplePresets[key];
  App.selectionChange = true;
  CM.setText(newContent);
});

document.addEventListener("DOMContentLoaded", async function (event) {
  await App.init();
});
