import { snippetCompletion } from '@codemirror/autocomplete';

// For syntax highlighting
export const ident2kind = {};
export const completions = [];

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
  "Integer!": {
    params: [{name: 'integer', type: 'number'}],
    returns: 'number',
    fn: a => Number.isInteger(a.value) ? a : { error: "zero assertion failed" },
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
  Modulo: {
    params: [{name: 'operand', type: 'number'}, {name: 'operand', type: 'number'}],
    returns: 'number',
    fn: (a, b) => a.value == 0 ? { error: "modulo by zero" } : b.value % a.value,
  },
  Sqrt: {
    params: [{name: 'operand', type: 'number'}],
    returns: 'number',
    fn: a => a.value < 0 ? { error: "sqrt of a negative number" } : Math.sqrt(a.value),
  },
  "==": {
    params: [{name: 'operand', type: 'any'}, {name: 'operand', type: 'any'}],
    returns: 'boolean',
    fn: (a, b) => {
      if (a.type != b.type)
        return { error: "left and right operands be of the same type" };
      return a.value === b.value;
    },
  },
  "!=": {
    params: [{name: 'operand', type: 'any'}, {name: 'operand', type: 'any'}],
    returns: 'boolean',
    fn: (a, b) => {
      if (a.type != b.type)
        return { error: "left and right operands be of the same type" };
      return a.value !== b.value;
    }
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
  "Length": {
    params: [{name: 'list', type: 'list'}],
    returns: 'number',
    fn: (l) => l.list.length,
  },
  Join: {
    params: [{name: 'string', type: 'string'}, {name: 'string', type: 'string'}],
    returns: 'string',
    fn: (a, b) => a.value + b.value,
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
    "Stack",
    "Clear",
  ].forEach(name => { ident2kind[name] = "builtin" });

  Object.keys(preludeEnv).forEach((name) => { ident2kind[name] = "builtin" });

  "+ - * / > < == != >= <=".split(" ").forEach(op => { ident2kind[op] = "operator" });

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
      type: entry[1],
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
    "Def ${Name} (${});",
    {
      label: "Def",
      type: "snippet",
      detail: "snippet",
    }
  ));
}

