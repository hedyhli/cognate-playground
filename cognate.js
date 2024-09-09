// Uncomment for tests and packaging
// import TreeSitter from 'web-tree-sitter';
import { ident2kind, Builtins, initIdent2kind, normalizeIdentifier, value2object, Docs as builtinsDocs, cognate2string, escape, stringEscapes } from './builtins.js';
import * as marked from 'marked';

const CALLSTACK_LIMIT = 3000;

export class PreludeError extends Error {
  constructor(message, options) {
    super(message, options);
  }
}

// Acts as a signal for the Begin continuation. It should only be treated as an
// error if caught outside of Begin.
export class BeginSignal extends Error {
  constructor() {
    super("cannot exit 'Begin' from outside the 'Begin' block");
  }
}

// Acts as a signal for the Stop function.
export class StopSignal extends Error {
  constructor(message, options) {
    super(message, options);
  }
}

// Global state
const G = {
  preludeEnv: {},
  preludeReady: false,
  ts: {
    parser: null,
  },
};

export async function initTS() {
  await TreeSitter.init()
  const parser = new TreeSitter();
  const Cognate = await TreeSitter.Language.load("tree-sitter-cognate.wasm");
  parser.setLanguage(Cognate);
  G.ts.parser = parser;
}

export function initPrelude(preludeText) {
  if (preludeText == undefined || preludeText == '' || !G.ts.parser) {
    throw new PreludeError("prelude content and parser must be initialized first");
  }

  const runner = new Runner();

  // Parse
  const preludeTree = G.ts.parser.parse(preludeText);
  let result = runner.parse(preludeTree);
  if (result.bail || runner.hasErrors()) {
    throw new PreludeError("failed to parse prelude");
  }
  // Exec
  result.error = "";
  try {
    result = runner.process(result.rootBlock, [], []);
  } catch (err) {
    if (!(err instanceof StopSignal)) {
      console.error(err);
      result.error = result.error || err.message;
    }
  }
  if (result.error != '') {
    throw new PreludeError(`failed to execute prelude: ${result.error}`);
  }
  G.preludeEnv = result.env;
}

export async function initCognate() {
  await G.ts.init();
}

export function setPreludeReady() {
  G.preludeReady = true;
  initIdent2kind(G.preludeEnv);
}

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
  block: (body, userCode, parent) => ({
    type: 'block',
    body: body, // list of objects
    // This env is a 'spec' of how the env should be initialized when
    // the block is executed (again). **IT SHOULD NOT BE MUTATED DIRECTLY**.
    //
    // Parent of the outmost block of the user's code is the preludeEnv.
    // The parent of that, in turn, in undefined.
    env: { parent: parent ? parent.env : undefined },
    userCode: userCode,
  }),
};

export const mockFrontend = {
  errors: {
    add() {},
    redraw() {},
    clear() {},
    hasAny() { return false; },
  },
  diagnostics: {
    add() {},
    clear() {},
  },
  style: {
    marked(s) { return s; },
    light(s) { return s; },
  },
  editor: {
      addMark() {},
      applyMarks() {},
    },
  store: {
      saveInput() {},
    },
  // TODO: A more structured approach that's independent of the DOM entirely.
  $stack: {},
  output: {
    add() {},
    newline() {},
    clear() {},
  },
};

export class Runner {
  constructor(f) {
    // f for 'frontend'
    this.callStackSize = 0;
    this.tree = undefined;
    // Either you give it all or none at all.
    this.ui = f ? f : mockFrontend;
    this.editor = (f && f.editor) ? f.editor : mockFrontend.editor;
    this.store = (f && f.store) ? f.store : mockFrontend.store;
    this.$stack = (f && f.$stack) ? f.$stack : {};
    this.output = (f && f.output) ? f.output : mockFrontend.output;
  }

  appendError(err) { this.ui.errors.add(err); }
  redrawErrors(heading) { this.ui.errors.redraw(heading); }
  clearErrors() { this.ui.errors.clear(); }
  hasErrors() { return this.ui.errors.hasAny(); }
  clearOutput() { this.output.clear(); }
  textMarked(s) { return this.ui.style.marked(s); }
  textLight(s) { return this.ui.style.light(s); }
  addDiagnostic(node, severity, message) { this.ui.diagnostics.add(node, severity, message); }
  clearDiagnostics() { this.ui.diagnostics.clear(); }

  // Object to string for displaying the stack & debugging
  repr(item) {
    switch (item.type) {
      case 'identifier':
        return escape(item.value);
      case 'number':
        return item.value;
      case 'boolean':
        return this.textMarked(item.value ? 'True' : 'False');
      case 'string':
        return `"${escape(item.value)}"`;
      case 'symbol':
        return `\\${escape(item.value)}`;
      case 'list':
        return "(" + [...item.list].reverse().map(this.repr, this).join(", ") + ")";
      case 'box':
        return "<" + this.repr(item.value[0]) + ">";
      case 'list':
        return "(" + [...item.list].reverse().map(this.repr, this).join(", ") + ")";
      default:
        return this.textLight(`(unknown item of type ${this.textMarked(escape(item.type))})`);
    }
  }

  // Represent a stack in a single line as a string.
  reprArr(arr) {
    let output = "";

    const iter = item => {
      if (item.type == 'block') {
        output += "[";
        if (item.body.length > 0) {
          item.body.forEach(iter);
          output = output.slice(0, output.length-2);
        }
        output += "], ";
      } else {
        // output += `${this.repr(item)}, `;
        let s = cognate2string(item);
        output += `${s.style ? this.ui.style[s.style](s.value) : s.value}, `;
      }
    };
    arr.forEach(iter);

    return `[${output.slice(0, output.length-2)}]`;
  }

  // Parse a syntax tree into a nested block to be processed, flattening
  // statement items in reverse order as per how Cognate operates the stack
  // within statements.
  //
  // The entire program has a root "block" representing the outer scope.
  parse(tree, rootEnv, userCode) {
    const root = tree.rootNode;
    let bail = false;
    let doc = undefined;

    let rootBlock = node2object.block([], userCode);
    rootBlock.env.parent = rootEnv;

    const inner = (node, currentBlock) => {
      let inStmt = false;
      let inBlock = false;

      let name;
      if (node.isMissing) {
        name = `MISSING ${node.type}`;
        this.appendError(`missing: ${this.textMarked(node.type)} ` + this.textLight(`(${node.startPosition.row}, ${node.startPosition.column})`));
        bail = true;
        return;
      } else if (node.isNamed) {
        name = node.type;
      } else {
        return;
      }

      if (name == "ERROR") {
        if (node.text != '') {
          this.appendError(
            `unexpected token: '${this.textMarked(node.text)}' ` + this.textLight(`(${node.startPosition.row}, ${node.startPosition.column})`)
          );
          this.addDiagnostic(node, "error", "unexpected token");
        } else {
          this.appendError("syntax error " + this.textLight(`(${node.startPosition.row}, ${node.startPosition.column})`));
          this.addDiagnostic(node, "error", "syntax error");
        }
        bail = true;
        return;
      }

      switch (name) {
        case "block":
          inBlock = true;
          currentBlock.body.push(node2object.block([], userCode, currentBlock));
          break;
        case "statement":
          inStmt = true;
          currentBlock.body.push(node2object.block([], userCode));
          currentBlock.body[currentBlock.body.length-1].env = currentBlock.env;
          break;
        case "multiline_comment":
          doc = node.text.substring(1, node.text.length-1).trim();
          break;
        case "inline_comment":
        case "line_comment":
          return;
        case "identifier": {
          let normalized = normalizeIdentifier(node.text);
          if (userCode) {
            // TODO: Prevent extra call in node2object
            if (ident2kind[normalized]) {
              this.editor.addMark(node, ident2kind[normalized]);
            }
          }
          if (normalized == 'Def') {
            let obj = node2object.identifier(node, userCode);
            obj.doc = doc;
            currentBlock.body.push(obj);
            doc = undefined;
            break;
          }
          // Fallthrough;
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
                if (stringEscapes[esc] == undefined) {
                  // This implementation of cognate will not be able to support all
                  // escape sequences cognac does, such as the terminal bell.
                  continue;
                }
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
            this.appendError(`INTERNAL ERROR: unknown token type ${this.textMarked(name)} from tree-sitter!`);
            bail = true;
            return;
          }
      }

      if (inStmt) {
        let pushto = currentBlock.body[currentBlock.body.length-1];
        node.children.forEach(child => inner(child, pushto));

        let stmt = currentBlock.body.pop();

        for(let i = stmt.body.length-1; i>=0; i--) {
          let item = stmt.body[i];
          let previous = stmt.body[i+1];
          if (item.type == 'identifier') {
            if (['Def', 'Let'].includes(item.value)) {
              if (!(previous && previous.type == 'identifier')) {
                this.appendError(`syntax error: identifier expected after ${item.value}`);
                this.addDiagnostic(item.node, "error", `syntax error: identifier expected after ${item.value}`);
                bail = true;
                return;
              } else {
                if (currentBlock.env[previous.value]) {
                  this.appendError(`${item.value} ${this.textMarked(previous.value)}: cannot shadow in the same block`);;
                  this.addDiagnostic(previous.node, "error", "cannot shadow in the same block");
                  bail = true;
                } else {
                  currentBlock.env[previous.value] = { type: '_predeclared', kind: item.value };
                }
                if (!userCode && currentBlock.env.parent == undefined) {
                  builtinsDocs[previous.value] = marked.parse(item.doc);
                }
              }
            }
          } else if (item.type == 'block') {
            item.env.parent = currentBlock.env;
          }
          currentBlock.body.push(item);
          previous = item;
        }

      } else if (inBlock) {
        let pushto = currentBlock.body[currentBlock.body.length-1];
        node.children.forEach(child => inner(child, pushto));

      } else if (node.type == 'source_file') {
        node.children.forEach(child => inner(child, currentBlock));

      } else {
        // XXX: nodes of other types ignored?
      }
    }

    inner(root, rootBlock);
    return { rootBlock: rootBlock, bail: bail }

  }

  analyze(currentBlock) {
  let bail = false;
    for (let item of currentBlock.body) {
      if (bail) {
        return;
      }
      if (item.type == 'identifier' && ident2kind[item.value] == undefined) {
        let foundDecl = false;
        let e = currentBlock.env;
        while (e) {
          // TODO
          // PERF: find ways to cache
          if (e[item.value]) {
            switch (e[item.value].kind) {
              case 'Let':
                foundDecl = true;
                break;
              case 'Def':
                foundDecl = true;
                this.editor.addMark(item.node, "function");
                break;
            }
            break;
          }
          e = e.parent;
        }
        if (!foundDecl) {
          this.appendError(`undefined symbol ${this.textMarked(escape(item.value))}`);
          this.addDiagnostic(item.node, "error", "undefined symbol");
        }
      } else if (item.type == 'block') {
        this.analyze(item);
      }
    }
  }

  run(code, edited) {
    if (!G.ts.parser || !G.preludeReady) {
      return;
    }

    this.clearErrors();
    this.clearDiagnostics();
    this.clearOutput();
    this.$stack.innerHTML = "";

    // Parse
    this.tree = G.ts.parser.parse(code, this.tree);
    let result = this.parse(this.tree, G.preludeEnv, true);
    this.analyze(result.rootBlock);
    this.editor.applyMarks(true);

    if (result.bail || this.hasErrors()) {
      this.redrawErrors("Error during parsing!");
    } else {
      this.redrawErrors();
      // Exec
      this.callStackSize = 0;
      result.error = "";
      try {
        result = this.process(result.rootBlock, [], []);
      } catch (err) {
        if (!(err instanceof StopSignal)) {
          if (!(err instanceof BeginSignal))
            console.error(err); // Only *unexpected* errors should be printed to console
          result.error = result.error || err.message;
        }
      }
      if (result.stack !== undefined) this.$stack.innerHTML = this.reprArr(result.stack);
      if (result.error != '') {
        this.appendError(result.error);
        this.redrawErrors("Runtime error!");
      } else {
        this.redrawErrors();
      }
    }

    // Save input after process finishes to prevent inability to exit potential
    // loop where program cannot terminate without editing source code.
    if (edited)
      this.store.saveInput(code);
  }

  // Execute a block within a possibly `scoped` environment, with an initial
  // stack `op`.
  process(/*readonly*/ currentBlock, op, beginSignals) {
    let env = {...currentBlock.env, parent: currentBlock.env.parent};
    let error = "";

    this.callStackSize += 1;
    if (this.callStackSize == CALLSTACK_LIMIT) {
      error = "call stack overflowed!";
    }

    function getVar(item) {
      if (item.type == 'identifier') {
        let e = env;
        while (e) {
          let value = e[item.value];

          if (value != undefined) {
            if (value.type == '_predeclared') {
              error = `${this.textMarked(item.value)} used before declaration`;
              this.addDiagnostic(item.node, "error", "variable used before declaration");
              return undefined;
            }
            return value;
          }
          e = e.parent;
        }
        // Should not happen, since these are already checked in analyze(), and
        // we are confident that the prelude is *correct*.
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

    const handleBuiltin = (fnName) => {
      const builtin = Builtins[fnName];
      let useFn;
      let args = [];

      if (builtin.overloads != undefined) {
        let draftError = `expected one of [${builtin.overloads.map((o) => o.params.map((p) => p.type)).join(', ')}]`
        let arg = op.pop();
        if (arg == undefined) {
          error = draftError;
          return;
        }
        args.push(arg);
        useFn = builtin.overloads.find((test) => test.params[0].type == arg.type);
        if (useFn == undefined) {
          error = `${draftError}, got ${arg.type}`;
          return;
        }
      } else {
        useFn = builtin;
      }

      const {params, returns, fn} = useFn;
      for(let i = args.length; i < params.length; i++) {
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
        error = `in ${this.textMarked(fnName)}: ` + ret.error;
        return undefined;
      }
      if (returns !== null) {
        op.push(ret.type == returns ? ret : value2object[returns](ret));
      }
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
          // XXX: Fix for:
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
          });
          break;
        }
        case 'identifier':
          if (next != undefined && next.type == 'identifier') {
            if (['Def', 'Let'].includes(next.value)) {
              op.push(item);
              continue;
            }
          }
        {
            let fn = getVar(item);
            if (fn && fn.type == 'function') {
              let result = { error: "" };
              try {
                result = this.process(fn.block, op, beginSignals);
              } catch (err) {
                if (beginSignals.includes(err) || err instanceof StopSignal)
                  throw err;
                if (!(err instanceof BeginSignal))
                  console.error(err);
                result.error = result.error || err.message;
              }
              if (result.error != "") {
                error = `in ${this.textMarked(item.value)}: ${result.error}`;
                break;
              }
              op = result.stack;
              continue;
            }
          }
          switch (item.value) {
            // Binding
            case 'Def': {
              // This check is technically done already during parsing.
              let a = expect(exists(op.pop(), 'identifier'), 'identifier');
              if (a == undefined) {
                error = `in ${this.textMarked('Def')}: ${error}`;
                break;
              }
              let b = expect(exists(op.pop(), `function body`), 'block');
              if (b == undefined) {
                error = `in ${this.textMarked('Def')}: ${error}`;
                break;
              }
              env[a.value] = { type: 'function', block: b, doc: item.doc };
              break;
            }
            case 'Let': {
              let a = expect(exists(op.pop(), 'identifier'), 'identifier');
              if (a == undefined) {
                error = `in ${this.textMarked('Let')}: ${error}`;
                break;
              }
              let b = op.pop();
              if (b == undefined) {
                error = `in ${this.textMarked('Let')}: expected value to set`;
                break;
              }
              env[a.value] = {...b};
              break;
            }
            case 'Set': {
              let a = expect(exists(op.pop(), 'box'), 'box');
              if (a == undefined) {
                error = `in ${this.textMarked('Set')}: ${error}`;
                break;
              }
              let b = op.pop();
              if (b == undefined) {
                error = `in ${this.textMarked('Set')}: expected value to set`;
                break;
              }
              a.value[0] = b;
              break;
            }

            // Special types
            case 'List': {
              let block = expect(exists(op.pop(), 'block'), 'block');
              if (block == undefined) {
                error = `in ${this.textMarked('List')}: ${error}`;
                break;
              }

              let list = [];
              let result = { error: "" };
              try {
                result = this.process(block, list, beginSignals);
              } catch (err) {
                if (beginSignals.includes(err) || err instanceof StopSignal)
                  throw err;
                if (!(err instanceof BeginSignal))
                  console.error(err);
                result.error = result.error || err.message;
              }
              if (result.error != "") {
                error = `in ${this.textMarked('List')}: ${result.error}`;
                break;
              }
              op.push(value2object.list(list));
              break;
            }
            case 'Table': {
              let block = expect(exists(op.pop(), 'block'), 'block');
              if (block == undefined) {
                error = `in ${this.textMarked('Table')}: ${error}`;
                break;
              }
              if (block.body.length % 2 != 0) {
                error = `in ${this.textMarked('Table')}: Table initializer must be key-value pairs`;
                break;
              }

              let pairs = [];
              let result = { error: "" };
              try {
                result = this.process(block, pairs, beginSignals);
              } catch (err) {
                if (beginSignals.includes(err) || err instanceof StopSignal)
                  throw err;
                if (!(err instanceof BeginSignal))
                  console.error(err);
                result.error = result.error || err.message;
              }
              if (result.error != "") {
                error = `in ${this.textMarked('List')}: ${result.error}`;
                break;
              }

              let table = Object.create(null);
              for (let i = 0; i < pairs.length; i += 2) {
                table = Builtins.Insert.fn(pairs[i+1], pairs[i], {table: table});
              }
              op.push(value2object.table(table));
              break;
            }
            case 'Box': {
              let value = exists(op.pop(), 'value');
              if (value == undefined) {
                error = `in ${this.textMarked('Box')}: ${error}`;
                break;
              }
              op.push(value2object.box(value));
              break;
            }
            case 'Unbox': {
              let box = expect(exists(op.pop(), 'box'), 'box');
              if (box == undefined) {
                error = `in ${this.textMarked('Unbox')}: ${error}`;
                break;
              }
              op.push(box.value[0]);
              break;
            }
            case 'Regex': {
              let s = expect(exists(op.pop(), 'regex string'), 'string');
              if (s.value.length == 0) {
                /// Not supported by CognaC
                error = `in ${this.textMarked('Regex')}: empty regex is invalid`;
                break;
              }
              let regex;
              try {
                regex = new RegExp(s.value);
              } catch (err) {
                error = `in ${this.textMarked('Regex')}: regex compile error: ${err}`;
                break;
              }
              op.push({
                type: 'block',
                body: [{type: 'identifier', value: '_applyRegex'}],
                env: {regex},
              });
              break;
            }
            case '_applyRegex': {
              let regex = env.regex;
              if (regex == undefined) {
                error = "internal error when applying regex!";
                break;
              }
              let s = expect(exists(op.pop(), 'string'), 'string');
              if (s == undefined) {
                error = `in applying regex: ${error}`;
                break;
              }
              op.push(value2object.boolean(regex.test(s.value)));
              break;
            }
            case 'Regex-match': {
              let s = expect(exists(op.pop(), 'regex string'), 'string');
              if (s.value.length == 0) {
                /// Not supported by CognaC
                error = `in ${this.textMarked('Regex-match')}: empty regex is invalid`;
                break;
              }
              let regex;
              try {
                regex = new RegExp(s.value);
              } catch (err) {
                error = `in ${this.textMarked('Regex-match')}: regex compile error: ${err}`;
                break;
              }
              op.push({
                type: 'block',
                body: [{type: 'identifier', value: '_matchRegex'}],
                env: {regex},
              });
              break;
            }
            case '_matchRegex': {
              let regex = env.regex;
              if (regex == undefined) {
                error = "internal error when matching regex!";
                break;
              }
              let s = expect(exists(op.pop(), 'string'), 'string');
              if (s == undefined) {
                error = `in matching regex: ${error}`;
                break;
              }
              let result = regex.exec(s.value);
              if (result) {
                for (let capture of [...result].splice(1).reverse()) {
                  op.push(value2object.string(capture));
                }
              }
              op.push(value2object.boolean(result != null));
              break;
            }

            // Special
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
            case 'Error': {
              let msg = expect(exists(op.pop(), 'error message'), 'string');
              if (msg == undefined) {
                // How ironic
                error = `in ${this.textMarked('Error')}: ${error}`;
              } else {
                error = msg.value;
              }
              break;
            }
            case 'Stop': {
              throw new StopSignal();
            }
						case 'Begin': {
              let block = expect(exists(op.pop(), 'block'), 'block');
              if (block == undefined) {
                error = `in ${this.textMarked('Begin')}: ${error}`;
                break;
              }

              let beginSignal = new BeginSignal();

              op.push({
                type: 'block',
                body: [{type: 'identifier', value: '_exitBegin'}],
                env: { beginSignal },
              });

              let result = { error: "" };
              try {
                result = this.process(block, op, [...beginSignals, beginSignal]);
              } catch (err) {
                if (beginSignals.includes(err) || err instanceof StopSignal)
                  throw err;
                if (err !== beginSignal) {
                if (!(err instanceof BeginSignal))
                  console.error(err);
                  result.error = result.error || err.message;
                }
              }

              if (result.error != "") {
                error = `in ${this.textMarked('Begin')}: ${result.error}`;
              }
              break;
            }

            case '_exitBegin': {
              throw env.beginSignal;
            }

            // I/O
            case 'Show': {
              let item = exists(op.pop(), 'value');
              let str = cognate2string(item, false);
              if (str != undefined) {
                op.push(str);
              }
              break;
            }
            case 'Print': {
              let item = exists(op.pop(), 'value');
              let str = cognate2string(item, false);
              if (str != undefined) {
                this.output.add(str);
                this.output.newline();
              } else {
                error = `in ${this.textMarked('Print')}: ${error}`
              }
              break;
            }
            case 'Put': {
              let item = exists(op.pop(), 'value');
              let str = cognate2string(item, false);
              if (str != undefined) {
                this.output.add(str);
              } else {
                error = `in ${this.textMarked('Print')}: ${error}`
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
              let a = exists(op.pop(), 'value');
              let type = item.value.slice(0, item.value.length-1).toLowerCase();
              if (a != undefined)
              op.push(value2object.boolean(a.type == type));
              else
              error = `in ${this.textMarked(item.value)}: ${error}`;
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
              error = `in ${this.textMarked(item.value)}: ${type} assertion failed`
              break;
            }

            default: {
              if (Builtins[item.value]) {
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

    this.callStackSize -= 1;
    return {stack: op, error: error, env: env};
  }
};

export { initIdent2kind, ident2kind, escape };
