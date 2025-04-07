const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
async function runAsyncCode(codeString, context = {}) {
    let userFunc;
    if (typeof codeString !== 'string')
        throw new TypeError('The first argument must be a string of code');
    if (isCallbackString(codeString)) {
        try { // if we got a callback string, we need to return it as is
            userFunc = eval(`(${codeString})`);
            let result = await userFunc(context);
            return result;
        }
        catch (error) {
            throw error;
        }
    }
    try { // if we have normal code, we make the whole context available
        userFunc = new AsyncFunction(...Object.keys(context), codeString);
        const result = await userFunc(...Object.values(context));
        return result;
    }
    catch (error) {
        throw error;
    }
}
function isCallbackString(code) {
    try {
        const fn = eval(`(${code})`);
        return typeof fn === 'function';
    }
    catch (e) {
        return false;
    }
}
export default runAsyncCode;
//# sourceMappingURL=execAsyncCode.js.map