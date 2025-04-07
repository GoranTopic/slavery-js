import { SlaveMethods } from '../service';
import { Listener } from '../network';
declare function toListeners(slaveMethods: SlaveMethods): Listener[];
export default toListeners;
