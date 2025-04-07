import { SlaveMethods } from '../service/index.js';
import { Listener } from '../network/index.js';
declare function toListeners(slaveMethods: SlaveMethods): Listener[];
export default toListeners;
