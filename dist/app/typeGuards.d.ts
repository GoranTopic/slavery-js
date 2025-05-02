import SlaveMethods from '../service/types/SlaveMethods.js';
import Options from '../service/types/Options.js';

type callableFunction = (...args: any[]) => any;
declare function isSlaveMethods(obj: any): obj is SlaveMethods;
declare function isServiceOptions(obj: any): obj is Options;
declare function isMasterCallback(value: any): value is Function | callableFunction;

export { isMasterCallback, isServiceOptions, isSlaveMethods };
