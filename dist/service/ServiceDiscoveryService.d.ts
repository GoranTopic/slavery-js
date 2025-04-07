import Service from './Service.js';
import './types/ServiceAddress.js';
import './types/SlaveMethods.js';
import './types/Options.js';

declare const ServiceDiscoveryService: (host: string, port: string) => Service;

export { ServiceDiscoveryService as default };
