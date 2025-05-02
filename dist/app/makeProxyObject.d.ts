type proxyObjectCallback = (methodCalled: string, param1: any, param2?: any, param3?: any) => void | Promise<void>;
declare const makeProxyObject: (callback: proxyObjectCallback) => ProxyConstructor;

export { makeProxyObject as default };
