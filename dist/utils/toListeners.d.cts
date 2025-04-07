import SlaveMethods from '../service/types/SlaveMethods.cjs';
import Listener from '../network/types/Listener.cjs';

declare function toListeners(slaveMethods: SlaveMethods): Listener[];

export { toListeners as default };
