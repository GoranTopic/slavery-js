import Service from './Service.cjs';
import './types/ServiceAddress.cjs';
import './types/SlaveMethods.cjs';
import './types/Options.cjs';

declare const ServiceDiscoveryService: (host: string, port: string) => Service;

export { ServiceDiscoveryService as default };
