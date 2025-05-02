import SlaveMethods from '../service/types/SlaveMethods.cjs';
import Options from '../service/types/Options.cjs';

type callableFunction = (...args: any[]) => any;
declare function isSlaveMethods(obj: any): obj is SlaveMethods;
declare function isServiceOptions(obj: any): obj is Options;
declare function isMasterCallback(value: any): value is Function | callableFunction;

export { isMasterCallback, isServiceOptions, isSlaveMethods };
