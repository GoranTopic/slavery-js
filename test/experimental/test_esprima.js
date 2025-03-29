import * as esprima from 'esprima';
import * as estraverse from 'estraverse';


// Sample JavaScript code as a string
const code = `
function hello(value, {hello, word, logger, master}){ 
    let x = 3;
    value.run(paramters);
    value.execute(param1, param2);
    value.an;
    value.anotherFunction(param1, param2, param3);
    value
    hello();
    val.notFromValue();
    otherFunction();
}
`;

// Parse the code into an AST
const ast = esprima.parseScript(code);

// Function to collect method calls on a specific object with argument counts
function getCalledMethods(ast, objectName) {
    const calledMethods = [];
    // Traverse the AST
    estraverse.traverse(ast, {
        enter(node) {
            // Check for call expressions like value.run()
            if (
                node.type === 'CallExpression' &&
                node.callee.type === 'MemberExpression' &&
                node.callee.object.name === objectName
            ) {
                // Collect the method name and argument count
                calledMethods.push({
                    method: node.callee.property.name,
                    argCount: node.arguments.length
                });
            }
        }
    });
    return calledMethods;
}

/**
 * Extracts the name(s) of the parameter(s) at the specified index from the first function found in the given code.
 * Handles both regular and destructured parameters.
 * @param {string} code - The JavaScript code containing the function.
 * @param {number} index - The zero-based index of the parameter to retrieve.
 * @returns {string[]|null} - An array of parameter names, or null if no function or parameter at the specified index is found.
 */
function getParameterNamesByIndex(code, index) {
    // Parse the code into an Abstract Syntax Tree (AST)
    const ast = esprima.parseScript(code);
    let paramNames = null;
    // Traverse the AST to find function declarations or expressions
    estraverse.traverse(ast, {
        enter(node) {
            if (
                (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') &&
                node.params.length > index
            ) {
                // Get the parameter at the specified index
                const param = node.params[index];
                paramNames = extractParamNames(param);
                // Stop traversal after finding the first function with the specified parameter
                this.break();
            }
        }
    });
    return paramNames;
}

/**
 * Recursively extracts parameter names from a parameter node.
 * @param {object} param - The parameter node.
 * @returns {string[]} - An array of parameter names.
 */
function extractParamNames(param) {
    const names = [];
    if (param.type === 'Identifier') {
        names.push(param.name);
    } else if (param.type === 'AssignmentPattern') {
        names.push(...extractParamNames(param.left));
    } else if (param.type === 'ObjectPattern') {
        for (const property of param.properties) {
            names.push(...extractParamNames(property.value));
        }
    } else if (param.type === 'ArrayPattern') {
        for (const element of param.elements) {
            if (element) {
                names.push(...extractParamNames(element));
            }
        }
    }
    return names;
}


// get the name of the first parameter in the code
const firstParamName = getParameterNamesByIndex(code, 0)[0];
console.log('First parameter name:', firstParamName);

// get the name of the second parameter in the code
const secondParamName = getParameterNamesByIndex(code, 1);
console.log('Second parameter name:', secondParamName);

// get the names of methods called on "value"
const methodsCalledOnValue = getCalledMethods(ast, firstParamName);
console.log('Methods called on the first paramter:', methodsCalledOnValue);
