import type { SlaveMethods, Options as ServiceOptions } from '../service/types/index.js';
type callableFunction = (...args: any[]) => any;
declare function isSlaveMethods(obj: any): obj is SlaveMethods;
declare function isServiceOptions(obj: any): obj is ServiceOptions;
declare function isMasterCallback(value: any): value is Function | callableFunction;
export { isSlaveMethods, isServiceOptions, isMasterCallback };
