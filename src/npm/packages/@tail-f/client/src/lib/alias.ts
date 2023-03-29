// To let minifier shorten globals as normal variables.
const a = Array;
const o = Object;
const s = Symbol;
const win = window;
const doc = document;
const nav = navigator;
const body = doc.body;
const loc = location;
const perf = performance;
const hist = win.history;
const undefined = void 0;
const nil = null;
export const T = true;
export const F = false;
export const stringify = JSON.stringify;
export const parse = JSON.parse;

export {
  a as Array,
  o as Object,
  win as window,
  doc as document,
  nav as navigator,
  body,
  loc as location,
  undefined,
  nil,
  s as Symbol,
  perf as performance,
  hist as history,
};
