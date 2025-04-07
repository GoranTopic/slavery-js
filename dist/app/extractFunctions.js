"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const esprima = __importStar(require("esprima"));
function extractFunctions(code) {
    const ast = esprima.parseScript(code, { range: true });
    let outer = '';
    const inner = [];
    for (const node of ast.body) {
        if (node.type === 'FunctionDeclaration' && node.id?.name === 'hello') {
            // Get outer function source code
            const [start, end] = node.range;
            const outerSource = code.slice(start, end);
            // Filter out inner functions from the body
            const innerRanges = [];
            for (const stmt of node.body.body) {
                if (stmt.type === 'FunctionDeclaration') {
                    const innerCode = code.slice(stmt.range[0], stmt.range[1]);
                    inner.push({ name: stmt.id.name, fn: innerCode });
                    innerRanges.push([stmt.range[0], stmt.range[1]]);
                }
                // Variable declarations like: let fn = function(...) { ... }
                if (stmt.type === 'VariableDeclaration') {
                    for (const decl of stmt.declarations) {
                        if (decl.init &&
                            (decl.init.type === 'FunctionExpression' ||
                                decl.init.type === 'ArrowFunctionExpression')) {
                            const fnName = decl.id.name;
                            const fnCode = code.slice(stmt.range[0], stmt.range[1]);
                            // Convert to "function name(args) { ... }" format
                            const args = decl.init.params.map((p) => code.slice(p.range[0], p.range[1])).join(', ');
                            const bodyCode = code.slice(decl.init.body.range[0], decl.init.body.range[1]);
                            const formattedFn = `function ${fnName}(${args}) ${bodyCode}`;
                            inner.push({ name: fnName, fn: formattedFn });
                            innerRanges.push([stmt.range[0], stmt.range[1]]);
                        }
                    }
                }
            }
            // Remove inner function code from outer function body
            let cleanedBody = code.slice(node.body.range[0] + 1, node.body.range[1] - 1);
            for (const [start, end] of innerRanges) {
                const innerCode = code.slice(start, end);
                cleanedBody = cleanedBody.replace(innerCode, '');
            }
            outer = `${code.slice(node.range[0], node.body.range[0] + 1)}${cleanedBody}\n}`;
        }
    }
    // create the functions objects
    let outer_function = new Function(outer);
    let inner_functions = inner.map((fn) => ({ name: fn.name, fn: new Function(fn.fn) }));
    // return
    return { outer_function, inner_functions };
}
exports.default = extractFunctions;
//# sourceMappingURL=extractFunctions.js.map