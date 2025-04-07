"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var extractFunctions_exports = {};
__export(extractFunctions_exports, {
  default: () => extractFunctions_default
});
module.exports = __toCommonJS(extractFunctions_exports);
var esprima = __toESM(require("esprima"), 1);
function extractFunctions(code) {
  const ast = esprima.parseScript(code, { range: true });
  let outer = "";
  const inner = [];
  for (const node of ast.body) {
    if (node.type === "FunctionDeclaration" && node.id?.name === "hello") {
      const [start, end] = node.range;
      const outerSource = code.slice(start, end);
      const innerRanges = [];
      for (const stmt of node.body.body) {
        if (stmt.type === "FunctionDeclaration") {
          const innerCode = code.slice(stmt.range[0], stmt.range[1]);
          inner.push({ name: stmt.id.name, fn: innerCode });
          innerRanges.push([stmt.range[0], stmt.range[1]]);
        }
        if (stmt.type === "VariableDeclaration") {
          for (const decl of stmt.declarations) {
            if (decl.init && (decl.init.type === "FunctionExpression" || decl.init.type === "ArrowFunctionExpression")) {
              const fnName = decl.id.name;
              const fnCode = code.slice(stmt.range[0], stmt.range[1]);
              const args = decl.init.params.map((p) => code.slice(p.range[0], p.range[1])).join(", ");
              const bodyCode = code.slice(decl.init.body.range[0], decl.init.body.range[1]);
              const formattedFn = `function ${fnName}(${args}) ${bodyCode}`;
              inner.push({ name: fnName, fn: formattedFn });
              innerRanges.push([stmt.range[0], stmt.range[1]]);
            }
          }
        }
      }
      let cleanedBody = code.slice(node.body.range[0] + 1, node.body.range[1] - 1);
      for (const [start2, end2] of innerRanges) {
        const innerCode = code.slice(start2, end2);
        cleanedBody = cleanedBody.replace(innerCode, "");
      }
      outer = `${code.slice(node.range[0], node.body.range[0] + 1)}${cleanedBody}
}`;
    }
  }
  let outer_function = new Function(outer);
  let inner_functions = inner.map((fn) => ({ name: fn.name, fn: new Function(fn.fn) }));
  return { outer_function, inner_functions };
}
var extractFunctions_default = extractFunctions;
//# sourceMappingURL=extractFunctions.cjs.map