import { SlaveMethods, Options as ServiceOptions } from '../service';

type callableFunction = (...args: any[]) => any;

function isSlaveMethods(obj: any): obj is SlaveMethods {
    if(obj === null || obj === undefined) return false;
  return (
    obj &&
    typeof obj === 'object' &&
    Object.values(obj).some(value => typeof value === 'function')
  );
}

function isServiceOptions(obj: any): obj is ServiceOptions {
    if(obj === null || obj === undefined) return false;
    return (
        obj &&
            typeof obj === 'object' &&
            Object.values(obj).every(value => typeof value !== 'function')
    );
}

function isMasterCallback(value: any): value is Function | callableFunction {
    if(value === null || value === undefined) return false;
    return typeof value === 'function';
}

export { isSlaveMethods, isServiceOptions, isMasterCallback };
