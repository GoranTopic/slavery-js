import SlaveMethods from '../service/types/SlaveMethods.js';
import Listener from '../network/types/Listener.js';

declare function toListeners(slaveMethods: SlaveMethods): Listener[];

export { toListeners as default };
