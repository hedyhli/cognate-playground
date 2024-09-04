import { snippetCompletion } from '@codemirror/autocomplete';

// For syntax highlighting
export const ident2kind = {};
export const completions = [];

export function normalizeIdentifier(name) {
  return name[0].toUpperCase() + name.substr(1).toLowerCase();
}

export const value2object = {
  number: value => ({ type: 'number', value: value }),
  string: (value, style) => ({ type: 'string', value: value, style: style }),
  boolean: value => ({ type: 'boolean', value: value ? true : false }),
  // Is this ever needed?
  identifier: value => ({ type: 'identifier', value: normalizeIdentifier(value) }),
  // And this.
  symbol: value => ({ type: 'symbol', value: value }),
  list: list => ({ type: 'list', list: list }),
  box: value => ({ type: 'box', value: [value] }),
  any: anything => anything,
};

function _deg2rad(deg) { return deg * Math.PI / 180; }
function _rad2deg(rad) { return rad * 180 / Math.PI; }

function _compare(x, y) {
  if (x.type != y.type)
  return false;
  switch (x.type) {
    case 'list': {
      let l1 = x.list, l2 = y.list;
      if (l1.length != l2.length)
      return false;
      return l1.every((a1, i) => _compare(a1, l2[i]));
    }
    case 'block':
      return x == y;
    case 'box':
      return _compare(x.value[0], y.value[0]);
    case 'number':
      return Math.abs(x.value - y.value) <= 0.5e-14 * Math.abs(x.value);
    default:
      return x.value === y.value;
  }
}

function singleNumberFn(fn, name) {
  return {
    params: [{name: name || 'operand', type: 'number'}],
    returns: 'number',
    fn: (a) => fn(a.value)
  };
}

export const Docs = {
  Def: "<strong>Def</strong> defines a function in the current scope. Like variables, functions cannot be redefined, but they can be shadowed.",
  Let: "<strong>Let</strong> binds the last item on the stack to a symbol. Variables are immutable and cannot be redefined, but they can be shadowed. To have mutability, you can use the <strong>Box</strong> type instead, and assign new values with <strong>Set</strong>.",
};

export const Builtins = {
  // Value checks
  "Zero?": {
    params: [{name: 'value', type: 'any'}],
    returns: 'boolean',
    fn: a => a.type == 'number' && a.value == 0,
  },
  "Zero!": {
    params: [{name: 'zero', type: 'number'}],
    returns: 'number',
    fn: a => a.value == 0 ? a : { error: "zero assertion failed" },
  },
  "Integer?": {
    params: [{name: 'value', type: 'any'}],
    returns: 'boolean',
    fn: a => a.type == 'number' && Number.isInteger(a.value),
  },

  // Meta
  If: {
    params: [
      {name: 'condition', type: 'boolean'},
      {name: "'then' clause", type: 'any'},
      {name: "'else' clause", type: 'any'},
    ],
    returns: 'any',
    fn: (cond, then, fallback) => cond.value ? then : fallback,
  },
  Error: {
    params: [{name: 'error message', type: 'string'}],
    returns: null,
    fn: msg => ({ error: msg.value }),
  },

  // Operators
  "+": {
    params: [{name: 'operand', type: 'number'}, {name: 'operand', type: 'number'}],
    returns: 'number',
    fn: (a, b) => a.value + b.value,
  },
  "-": {
    params: [{name: 'operand', type: 'number'}, {name: 'operand', type: 'number'}],
    returns: 'number',
    fn: (a, b) => b.value - a.value,
  },
  "/": {
    params: [{name: 'operand', type: 'number'}, {name: 'operand', type: 'number'}],
    returns: 'number',
    fn: (a, b) => a.value == 0 ? { error: "division by zero" } : b.value / a.value,
  },
  "*": {
    params: [{name: 'operand', type: 'number'}, {name: 'operand', type: 'number'}],
    returns: 'number',
    fn: (a, b) => a.value * b.value,
  },
  "^": {
    params: [{name: 'operand', type: 'number'}, {name: 'operand', type: 'number'}],
    returns: 'number',
    fn: (a, b) => a.value ** b.value,
  },
  Modulo: {
    params: [{name: 'operand', type: 'number'}, {name: 'operand', type: 'number'}],
    returns: 'number',
    fn: (a, b) => a.value == 0 ? { error: "modulo by zero" } : b.value % a.value,
  },
  Exp: singleNumberFn(Math.exp),
  Sqrt: singleNumberFn(a => a < 0 ? { error: "sqrt of a negative number" } : Math.sqrt(a)),
  Floor: singleNumberFn(Math.floor),
  Ceiling: singleNumberFn(Math.ceil),
  Round: singleNumberFn(Math.round),
  Abs: singleNumberFn(Math.abs),
  Ln: singleNumberFn(a => (a <= 0 ? {error: "math error: Ln of a non-positive number"} : Math.log(a))),
  Log: {
    params: [{name: 'base', type: 'number'}, {name: 'operand', type: 'number'}],
    returns: 'number',
    fn: (base, a) => (base.value == 1 ? {error: "attempt to get log with base 1"} : a.value <= 0 ? {error: "math error: Log of non-positive number"} : Math.log(a.value) / Math.log(base.value)),
  },

  Sin: singleNumberFn(Math.sin, 'operand in radians'),
  Cos: singleNumberFn(Math.cos, 'operand in radians'),
  // XXX: Inf
  Tan: singleNumberFn(Math.tan, 'operand in degrees'),

  Sind: singleNumberFn((a) => Math.sin(_deg2rad(a)), 'operand in radians'),
  Cosd: singleNumberFn((a) => Math.cos(_deg2rad(a)), 'operand in radians'),
  Tand: singleNumberFn((a) => Math.tan(_deg2rad(a)), 'operand in radians'),

  Asin: singleNumberFn(Math.asin),
  Acos: singleNumberFn(Math.acos),
  Atan: singleNumberFn(Math.atan),

  Asin: singleNumberFn((a) => Math.abs(a) > 1 ? {error: "math domain error"} : Math.asin(a)),
  Acos: singleNumberFn((a) => Math.abs(a) > 1 ? {error: "math domain error"} : Math.acos(a)),
  Atan: singleNumberFn(Math.atan),

  Asind: singleNumberFn((a) => Math.abs(a) > 1 ? {error: "math domain error"} : _rad2deg(Math.asin(a))),
  Acosd: singleNumberFn((a) => Math.abs(a) > 1 ? {error: "math domain error"} : _rad2deg(Math.acos(a))),
  Atand: singleNumberFn((a) => _rad2deg(Math.atan(a))),

  // TODO: domains
  Sinh: singleNumberFn((a) => Math.sinh(a), 'operand in radians'),
  Cosh: singleNumberFn((a) => Math.cosh(a), 'operand in radians'),
  Tanh: singleNumberFn((a) => Math.tanh(a), 'operand in radians'),

  Sinhd: singleNumberFn((a) => Math.sinh(_deg2rad(a)), 'operand in radians'),
  Coshd: singleNumberFn((a) => Math.cosh(_deg2rad(a)), 'operand in radians'),
  Tanhd: singleNumberFn((a) => Math.tanh(_deg2rad(a)), 'operand in radians'),

  Random: {
    params: [{name: 'start', type: 'number'}, {name: 'end', type: 'number'}],
    returns: 'number',
    fn: (a, b) => a.value > b.value ? { error: `invalid range ${a.value}..${b.value}` } : Math.floor(Math.random() * (b.value - a.value)) + a.value,
  },
  "==": {
    params: [{name: 'operand', type: 'any'}, {name: 'operand', type: 'any'}],
    returns: 'boolean',
    fn: (a, b) => _compare(a, b),
  },
  "!=": {
    params: [{name: 'operand', type: 'any'}, {name: 'operand', type: 'any'}],
    returns: 'boolean',
    fn: (a, b) => !_compare(a, b),
  },
  ">": {
    params: [{name: 'operand', type: 'number'}, {name: 'operand', type: 'number'}],
    returns: 'boolean',
    fn: (a, b) => b.value > a.value,
  },
  "<": {
    params: [{name: 'operand', type: 'number'}, {name: 'operand', type: 'number'}],
    returns: 'boolean',
    fn: (a, b) => b.value < a.value,
  },
  "<=": {
    params: [{name: 'operand', type: 'number'}, {name: 'operand', type: 'number'}],
    returns: 'boolean',
    fn: (a, b) => b.value <= a.value,
  },
  ">=": {
    params: [{name: 'operand', type: 'number'}, {name: 'operand', type: 'number'}],
    returns: 'boolean',
    fn: (a, b) => b.value >= a.value,
  },
  Not: {
    params: [{name: 'operand', type: 'boolean'}],
    returns: 'boolean',
    fn: (a) => !a.value,
  },
  And: {
    params: [{name: 'operand', type: 'boolean'}, {name: 'operand', type: 'boolean'}],
    returns: 'boolean',
    fn: (a, b) => a.value && b.value,
  },
  Or: {
    params: [{name: 'operand', type: 'boolean'}, {name: 'operand', type: 'boolean'}],
    returns: 'boolean',
    fn: (a, b) => a.value || b.value,
  },
  Xor: {
    params: [{name: 'operand', type: 'boolean'}, {name: 'operand', type: 'boolean'}],
    returns: 'boolean',
    fn: (a, b) => a.value != b.value,
  },
  Push: {
    params: [{name: 'item to push', type: 'any'}, {name: 'list to push to', type: 'list'}],
    returns: 'list',
    fn: (item, l) => {
      let newList = [...l.list];
      newList.push(item);
      return newList;
    }
  },
  First: {
    params: [{name: 'list', type: 'list'}],
    returns: 'any',
    fn: (l) => {
      if (l.list.length == 0) {
        return { error: 'attempt to get first item of empty list' };
      }
      return l.list[l.list.length-1];
    }
  },
  Rest: {
    params: [{name: 'list', type: 'list'}],
    returns: 'list',
    fn: (l) => {
      if (l.list.length == 0) {
        return { error: 'attempt to get rest of empty list' };
      }
      return [...l.list].splice(0, l.list.length-1);
    }
  },
  Empty: {
    params: [],
    returns: 'list',
    fn: () => [],
  },
  "Empty?": {
    params: [{name: 'list', type: 'list'}],
    returns: 'boolean',
    fn: (l) => l.list.length == 0,
  },
  Length: {
    params: [{name: 'list', type: 'list'}],
    returns: 'number',
    fn: (l) => l.list.length,
  },
  Join: {
    params: [{name: 'string', type: 'string'}, {name: 'string', type: 'string'}],
    returns: 'string',
    fn: (a, b) => a.value + b.value,
  },
  Head: {
    params: [{name: 'string', type: 'string'}],
    returns: 'string',
    fn: (s) => s.value.length == 0 ? { error: "attempt to get Head of empty string" } : s.value[0],
  },
  Tail: {
    params: [{name: 'string', type: 'string'}],
    returns: 'string',
    fn: (s) => s.value.length == 0 ? { error: "attempt to get Tail of empty string" } : s.value.substr(1),
  },
  "String-length": {
    params: [{name: 'string', type: 'string'}],
    returns: 'number',
    fn: (s) => s.value.length,
  },
  Substring: {
    params: [
      {name: 'start', type: 'number'},
      {name: 'end', type: 'number'},
      {name: 'string', type: 'string'},
    ],
    returns: 'string',
    fn: (start, end, s) => {
      let max = s.value.length - 1;
      let a = start.value, b = end.value;
      if (a < 0 || b < 0 || a > b || a > max) {
        return { error: `invalid range: ${a}..=${b}` };
      }
      return s.value.substr(a, b-a+1);
    },
  },
  Ordinal: {
    params: [{name: 'string', type: 'string'}],
    returns: 'number',
    fn: (s) => s.value.length != 1 ? { error: `invalid string of length ${s.value.length}, should be of length 1` } : s.value.charCodeAt(0),
  },
  Character: {
    params: [{name: 'ordinal number', type: 'number'}],
    returns: 'string',
    fn: (a) => {
      let s = String.fromCharCode(a.value);
      return s == '' ? { error: `cannot convert ${a.value} to UTF16 character` } : s;
    },
  },
  Number: {
    params: [{name: 'string to be converted to number', type: 'string'}],
    returns: 'string',
    fn: (s) => {
      let n = Number.parseFloat(s.value);
      return Number.isNaN(n) ? { error: `cannot parse ${s.value} to number` } : n;
    },
  },
  Split: {
    params: [{name: 'separator', type: 'string'}, {name: 'string', type: 'string'}],
    returns: 'list',
    fn: (sep, s) => {
      if (sep.value.length == 0) {
        return { error: "empty separator" };
      }
      if (s.value.indexOf(sep.value) == -1) {
        return [];
      }
      return s.value.split(sep.value).reverse().map(value2object.string);
    },
  },
  Uppercase: {
    params: [{name: 'string', type: 'string'}],
    returns: 'string',
    fn: s => s.value.toUpperCase(),
  },
  Lowercase: {
    params: [{name: 'string', type: 'string'}],
    returns: 'string',
    fn: s => s.value.toLowerCase(),
  },
};

export function initIdent2kind(preludeEnv) {
  Object.keys(Builtins).forEach(name => { ident2kind[name] = "builtin" });
  // Ones that are special-cased in `process`
  [
    "Number?",
    "Number!",
    "Boolean?",
    "Boolean!",
    "List?",
    "List!",
    "Symbol?",
    "Symbol!",
    "Block?",
    "Block!",
    "Print",
    "Show",
    "Put",
    "List",
    "Box",
    "Unbox",
    "Regex",
    "Regex-match",
    "Stack",
    "Clear",
    "Error",
    "Stop",
    "Begin",
  ].forEach(name => { ident2kind[name] = "builtin" });

  if (preludeEnv)
    Object.keys(preludeEnv).forEach((name) => { ident2kind[name] = "builtin" });

  "+ - * / > < == != >= <= ^".split(" ").forEach(op => { ident2kind[op] = "operator" });

  [
    "Def",
    "Let",
    "Set",
    "For",
    "While",
    "If",
    "Unless",
    "When",
    "Until"
  ].forEach(kw => { ident2kind[kw] = "keyword" });

  Object.entries(ident2kind).forEach(
    entry => { completions.push({
      label: entry[0],
      type: entry[1] == "builtin" ? "function" : entry[1],
      detail: entry[1],
    }) }
  );
  completions.push(snippetCompletion(
    "Prints (${});",
    {
      label: "Prints",
      type: "snippet",
      detail: "snippet",
    }
  ));
  completions.push(snippetCompletion(
    "Def ${Name} (\n\t${}\n);",
    {
      label: "Def",
      type: "snippet",
      detail: "snippet",
    }
  ));
}

