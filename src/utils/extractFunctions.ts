import * as esprima from 'esprima';

type ParsedFunction = {
    outer_function: string;
    inner_functions: { name: string; fn: string }[];
};

function extractFunctions(code: string): ParsedFunction {
    const ast = esprima.parseScript(code, { range: true });
    let outer_function = '';
    const inner_functions: { name: string; fn: string }[] = [];

for (const node of ast.body) {
    if (node.type === 'FunctionDeclaration' && node.id?.name === 'hello') {
        // Get outer function source code
        const [start, end] = node.range!;
        const outerSource = code.slice(start, end);

        // Filter out inner functions from the body
        const innerRanges: [number, number][] = [];

        for (const stmt of node.body.body) {
            if (stmt.type === 'FunctionDeclaration') {
                const innerCode = code.slice(stmt.range![0], stmt.range![1]);
                inner_functions.push({ name: stmt.id!.name, fn: innerCode });
                innerRanges.push([stmt.range![0], stmt.range![1]]);
            }

            // Variable declarations like: let fn = function(...) { ... }
            if (
                stmt.type === 'VariableDeclaration'
            ) {
                for (const decl of stmt.declarations) {
                    if (
                        decl.init &&
                        (decl.init.type === 'FunctionExpression' ||
                         decl.init.type === 'ArrowFunctionExpression')
                    ) {
                        const fnName = (decl.id as any).name;
                        const fnCode = code.slice(stmt.range![0], stmt.range![1]);

                        // Convert to "function name(args) { ... }" format
                        const args = decl.init.params.map((p) => code.slice(p.range![0], p.range![1])).join(', ');
                        const bodyCode = code.slice(decl.init.body.range![0], decl.init.body.range![1]);
                        const formattedFn = `function ${fnName}(${args}) ${bodyCode}`;

                        inner_functions.push({ name: fnName, fn: formattedFn });
                        innerRanges.push([stmt.range![0], stmt.range![1]]);
                    }
                }
            }
        }

        // Remove inner function code from outer function body
        let cleanedBody = code.slice(node.body.range![0] + 1, node.body.range![1] - 1);
        for (const [start, end] of innerRanges) {
            const innerCode = code.slice(start, end);
            cleanedBody = cleanedBody.replace(innerCode, '');
        }

        outer_function = `${code.slice(node.range![0], node.body.range![0] + 1)}${cleanedBody}\n}`;
}
}
// return
return { outer_function, inner_functions };
}



export default extractFunctions;
