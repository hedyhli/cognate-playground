import { snippetCompletion } from '@codemirror/autocomplete';

// For syntax highlighting
export const ident2kind = {};
export const completions = [];
export const docs = {};

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
  table: table => ({ type: 'table', table: table }),
  box: value => ({ type: 'box', value: [value] }),
  any: anything => anything,
};

export const stringEscapes = {b: '\b', t: '\t', n: '\n', v: '\v', f: '\f', r: '\r', '"': '"', '\\': '\\'};
const stringEscapesReverse = {'\b': '\\b', '\t': '\\t', '\n': '\\n', '\v': '\\v', '\f': '\\f', '\r': '\\r', '"': '\\"', '\\': '\\\\'};

function reprString(str) {
  let chars = str.split('');
  let quoted = chars.map((char) => stringEscapesReverse[char] || char).join('');
  return '"' + quoted + '"';
}

function table2string_inner(table, checkedBoxes) {
  if (!table || !table.key) return '';
  let s = '';
  s += table2string_inner(table.left, checkedBoxes);
  s += cognate2string(table.key, true, checkedBoxes).value;
  s += ':';
  s += cognate2string(table.value, true, checkedBoxes).value;
  s += ' ';
  s += table2string_inner(table.right, checkedBoxes);
  return s;
}

// Taken from lodash
export function escape(string) {
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

// Object to string for the output
export function cognate2string(item, quotedString, checkedBoxes) {
  if (item == undefined) {
    return undefined;
  }

  if (checkedBoxes == undefined) {
    checkedBoxes = [];
  }

  switch (item.type) {
    case 'block':
      return value2object.string('(block)');
    case 'string': {
      if (quotedString) {
        // convert back string escapes
        return value2object.string(reprString(item.value));
      }
      return value2object.string(item.value);
    }
    case 'symbol': {
      let s = value2object.string(item.value);
      s.style = 'marked';
      return s;
    }
    case 'number':
      return value2object.string(item.value.toString());
    case 'boolean': {
      let s = value2object.string(item.value ? 'True' : 'False');
      s.style = 'marked';
      return s;
    }
    case 'box': {
      if (checkedBoxes.find((check) => check == item)) {
        return value2object.string('...');
      }
      // PERF: ???
      checkedBoxes = [...checkedBoxes, item];
      let s = cognate2string(item.value[0], quotedString, checkedBoxes);
      s.value = `[${s.value}]`;
      return s;
    }
    case 'list':
      // XXX: Does not support unknown item type within the map call.
      return value2object.string(`(${[...item.list].reverse().map(item => cognate2string(item, true, checkedBoxes).value).join(' ')})`);
    case 'table':
      return value2object.string(`{ ${table2string_inner(item.table, checkedBoxes)}}`);
    default:
      return {
        error: `unknown item of type ${escape(item.type)}`,
      };
  }
}

const typeOrder = {number: 1, symbol: 2, boolean: 3, string: 4, box: 5, list: 6, table: 7, io: 8, block: 9};

function _deg2rad(deg) { return deg * Math.PI / 180; }
function _rad2deg(rad) { return rad * 180 / Math.PI; }

function _compare(x, y) {
  if (x.type != y.type) {
    let diff = typeOrder[x.type] - typeOrder[y.type];
    return diff == 0 ? 0 : diff > 0 ? 1 : -1;
  }
  switch (x.type) {
    case 'list': {
      let l1 = x.list, l2 = y.list;
      let diff = 0;
      for (let i = 0; diff == 0 && i < l1.length; i++) {
        if (!l2[i])
          diff = 1;
        else
          diff = _compare(l1[i], l2[i]);
      }
      if (l1.length < l2.length) {
        diff = -1;
      }
      return diff;
    }
    case 'block':
    case 'box':
      return x == y ? 0 : 1;
    case 'number':
      return Math.abs(x.value - y.value) <= 0.5e-14 * Math.abs(x.value) ? 0
        : x.value > y.value ? 1 : -1;
    case 'string':
    case 'symbol':
    case 'boolean':
      return x.value == y.value ? 0 : x.value > y.value ? 1 : -1;
    case 'table': {
      return compare_table(x.table, y.table);
    }
    default:
      // unreachable
      return 1;
  }
}

function compare_table(a, b) {
  if (!a || !a.key) return (!b || !b.key) ? 0 : -1;
  if (!b || !b.key) return 1;

  let diff = 0;

  if (!(diff = _compare(a.key, b.key)))
    if (!(diff = _compare(a.value, b.value)))
      if (!(diff = compare_table(a.left, b.left)))
        diff = compare_table(a.right, b.right);

  return diff;
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
    fn: (a, b) => _compare(a, b) == 0,
  },
  "!=": {
    params: [{name: 'operand', type: 'any'}, {name: 'operand', type: 'any'}],
    returns: 'boolean',
    fn: (a, b) => _compare(a, b) != 0,
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
    overloads: [
      {
        params: [{name: 'list', type: 'list'}],
        returns: 'any',
        fn: (l) => {
          if (l.list.length == 0) {
            return { error: 'attempt to get first item of empty list' };
          }
          return l.list[l.list.length-1];
        }
      },
      {
        params: [{name: 'string', type: 'string'}],
        returns: 'string',
        fn: (s) => s.value.length == 0 ? { error: "attempt to get Head of empty string" } : s.value[0],
      }
    ]
  },
  Rest: {
    overloads: [
      {
        params: [{name: 'list', type: 'list'}],
        returns: 'list',
        fn: (l) => {
          if (l.list.length == 0) {
            return { error: 'attempt to get rest of empty list' };
          }
          return [...l.list].splice(0, l.list.length-1);
        }
      },
      {
        params: [{name: 'string', type: 'string'}],
        returns: 'string',
        fn: (s) => s.value.length == 0 ? { error: "attempt to get Tail of empty string" } : s.value.substr(1),
      }
    ]
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
    overloads: [
      {
        params: [{name: 'list', type: 'list'}],
        returns: 'number',
        fn: (l) => l.list.length,
      },
      {
        params: [{name: 'string', type: 'string'}],
        returns: 'number',
        fn: (s) => s.value.length,
      }
    ]
  },
  Join: {
    params: [{name: 'string', type: 'string'}, {name: 'string', type: 'string'}],
    returns: 'string',
    fn: (a, b) => a.value + b.value,
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
  Insert: {
    params: [
      {name: 'key', type: 'any'},
      {name: 'value', type: 'any'},
      {name: 'table', type: 'table'},
    ],
    returns: 'table',
    fn: (key, value, table) => {
      if (['box', 'block'].includes(key.type)) {
        return {error: `can't index table with ${key.type}`};
      }
      return table_insert(key, value, table.table);
    }
  },
  Remove: {
    params: [
      {name: 'key', type: 'any'},
      {name: 'table', type: 'table'},
    ],
    returns: 'table',
    fn: (key, table) => {
      if (['box', 'block'].includes(key.type)) {
        return {error: `can't index table with ${key.type}`};
      }
      return table_remove(key, table.table);
    }
  },
  Has: {
    params: [{name: 'key', type: 'any'}, {name: 'table', type: 'table'}],
    returns: 'boolean',
    fn: (key, table) => {
      if (['box', 'block'].includes(key.type)) {
        return {error: `can't index table with ${key.type}`};
      }
      return table_get(key, table.table) != undefined;
    }
  },
  ".": {
    params: [{name: 'key', type: 'any'}, {name: 'table', type: 'table'}],
    returns: 'any',
    fn: (key, table) => {
      if (['box', 'block'].includes(key.type)) {
        return {error: `can't index table with ${key.type}`};
      }
      let value = table_get(key, table.table);
      if (value == undefined) {
        return {error: `${cognate2string(key).value} is not in table`};
      }
      return value;
    }
  },
  Keys: {
    params: [{name: 'table', type: 'table'}],
    returns: 'list',
    fn: (table) => table_entries(table.table).map((e) => e.key),
  },
  Values: {
    params: [{name: 'table', type: 'table'}],
    returns: 'list',
    fn: (table) => table_entries(table.table).map((e) => e.value),
  },
};

function table_entries(table) {
  if (!table) return [];

  function _entries(t) {
    if (t.right) _entries(t.right);
    l.push({ key: t.key, value: t.value });
    if (t.left) _entries(t.left);
  }

  const l = [];
  _entries(table);
  return l;
}

function mktable(key, value, left, right, level)
{
  let T = Object.create(null);
  T.key = key;
  T.value = value;
  T.left = left;
  T.right = right;
  T.level = level;
  return T;
}

function table_get(key, table) {
  if (!table) return;
  if (_compare(key, table.key) == 0) return table.value;
  return table_get(key, table.left) || table_get(key, table.right);
}

function table_skew(T) {
  if (!T) return null;
  else if (!T.left) return T;
  else if (T.left.level == T.level)
    return mktable(T.left.key, T.left.value, T.left.left,
        mktable(T.key, T.value, T.left.right, T.right, T.level),
        T.left.level);
  else return T;
}

function table_split(T)
{
  if (!T) return null;
  else if (!T.right || !T.right.right) return T;
  else if (T.level == T.right.right.level)
    return mktable(T.right.key, T.right.value,
        mktable(T.key, T.value, T.left, T.right.left, T.level),
        T.right.right, T.right.level);
  else return T;
}

function table_insert(key, value, table)  {
  if (!table) return mktable(key, value, null, null, 1);
  let T = mktable(table.key, table.value, table.left, table.right, table.level);
  switch (_compare(table.key, key)) {
    case 0:
      T.key = key;
      T.value = value;
      break;
    case 1:
      T.left = table_insert(key, value, table.left);
      break;
    default:
      T.right = table_insert(key, value, table.right);
  }
  T = table_skew(T);
  T = table_split(T);
  return T;
}

function table_remove(key, T) {
  if (!T) return { error: `${cognate2string(key).value} is not in table`, };
  let diff = _compare(T.key, key);
  let T2 = null;

  if (diff < 0) {
    let N = table_remove(key, T.right);
    if (N && N.error) return N;
    T2 = mktable(T.key, T.value, T.left, N, T.level);
  }
  else if (diff > 0) {
    let N = table_remove(key, T.left);
    if (N && N.error) return N;
    T2 = mktable(T.key, T.value, N, T.right, T.level);
  }
  else if (!T.left && !T.right) return null;
  else if (!T.left) {
      let L = T.right;
      while (L.left) L = L.left;
      let N = table_remove(L.key, T.right);
      if (N && N.error) return N;
      T2 = mktable(L.key, L.value, T.left, N, L.level);
  }
  else {
      let L = T.left;
      while (L.right) L = L.right;
      let N = table_remove(L.key, T.left);
      if (N && N.error) return N;
      T2 = mktable(L.key, L.value, N, T.right, L.level);
  }

  if (T2.left && T2.right) {
    let should_be = 1 + Math.min(T2.left.level, T2.right.level);
    if (should_be < T2.level) {
      T2.level = should_be;
      if (should_be < T2.right.level) T2.right.level = should_be
    }
  }

  /*
  if (T2.right) {
    T2.right.right = table_skew(T2.right.right);
    T2.right = table_skew(T2.right);
  }
  */

  T2 = table_skew(T2);

  //if (T2.right) T2.right = table_split(T2.right);

  T2 = table_split(T2);

  return T2;
}

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
    "Table",
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
    entry => {
      let doc = Docs[entry[0]];
      completions.push({
        label: entry[0],
        type: entry[1] == "builtin" ? "function" : entry[1],
        detail: entry[1],
        info: doc ? () => {
          const elem = document.createElement("div");
          elem.innerHTML = doc;
          return elem;
        } : undefined,
      })
    }
  );
  completions.push(snippetCompletion(
    "Prints (${});",
    {
      label: "Prints",
      type: "snippet",
      detail: "snippet",
      info: "Print a list of values",
    }
  ));
  completions.push(snippetCompletion(
    "Def ${Name} (\n\t${}\n);",
    {
      label: "Def",
      type: "snippet",
      detail: "snippet",
      info: "Define a function",
    }
  ));
}

