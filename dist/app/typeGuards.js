function isSlaveMethods(obj) {
    if (obj === null || obj === undefined)
        return false;
    return (obj &&
        typeof obj === 'object' &&
        Object.values(obj).some(value => typeof value === 'function'));
}
function isServiceOptions(obj) {
    if (obj === null || obj === undefined)
        return false;
    return (obj &&
        typeof obj === 'object' &&
        Object.values(obj).every(value => typeof value !== 'function'));
}
function isMasterCallback(value) {
    if (value === null || value === undefined)
        return false;
    return typeof value === 'function';
}
export { isSlaveMethods, isServiceOptions, isMasterCallback };
//# sourceMappingURL=typeGuards.js.map