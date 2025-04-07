import "../chunk-V6TY7KAL.js";
import * as esprima from "esprima";
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
export {
  extractFunctions_default as default
};
//# sourceMappingURL=extractFunctions.js.map