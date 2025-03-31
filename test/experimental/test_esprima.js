import * as esprima from 'esprima';
import escodegen from 'escodegen';

// Sample JavaScript code as a string
const function_code = `
function hello(value, {hello, word, logger, master}){ 

    // some code
    1 + 4;
    let internal = 5;
    console.log('Hello World' + internal);

    let fn = function (param1, param2) {
        something();
    }

    let fn1 = (param1, param2) => {
        something();
    }

    function hello(param1, param2){
        console.log('Hello');
        console.log('World');
    }
}`;

/**
 * Extract the outer function (with inner functions removed) and all inner functions separately.
 * @param {string} code - JavaScript function code as a string.
 * @returns {{ outer_function: string, inner_functions: { name: string, fn: string }[] }}
 */
function extractOuterAndInnerFunctions(code) {
    const ast = esprima.parseScript(code, { range: true });
    let result = {
        outer_function: '',
        inner_functions: []
    };

    for (const node of ast.body) {
        if (node.type === 'FunctionDeclaration') {
            const outerFunctionNode = JSON.parse(JSON.stringify(node)); // Deep clone to modify safely

            // Filter out inner function declarations and variable declarations with functions
            outerFunctionNode.body.body = outerFunctionNode.body.body.filter(statement => {
                // Identify inner function declarations
                if (statement.type === 'FunctionDeclaration') {
                    result.inner_functions.push({
                        name: statement.id.name,
                        fn: escodegen.generate(statement)
                    });
                    return false; // Remove from outer function body
                }

                // Identify variable declarations with function expressions or arrow functions
                if (statement.type === 'VariableDeclaration') {
                    const isFunctionVar = statement.declarations.some(decl =>
                        decl.init &&
                        (decl.init.type === 'FunctionExpression' || decl.init.type === 'ArrowFunctionExpression')
                    );

                    if (isFunctionVar) {
                        for (const decl of statement.declarations) {
                            if (
                                decl.init &&
                                (decl.init.type === 'FunctionExpression' || decl.init.type === 'ArrowFunctionExpression')
                            ) {
                                const fnBody = escodegen.generate(decl.init);
                                result.inner_functions.push({
                                    name: decl.id.name,
                                    fn: `function ${decl.id.name}${fnBody.slice(fnBody.indexOf('('))}`
                                });
                            }
                        }
                        return false; // Remove from outer function body
                    }
                }

                return true; // Keep non-function-related code
            });

            result.outer_function = escodegen.generate(outerFunctionNode);
            break; // Only process the first outer function
        }
    }

    return result;
}

console.log(extractOuterAndInnerFunctions(function_code));
