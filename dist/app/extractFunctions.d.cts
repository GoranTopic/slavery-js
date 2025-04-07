type ParsedFunction = {
    outer_function: Function;
    inner_functions: {
        name: string;
        fn: Function;
    }[];
};
declare function extractFunctions(code: string): ParsedFunction;

export { extractFunctions as default };
