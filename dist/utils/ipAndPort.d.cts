export { default as getPort } from 'get-port';

interface NetworkInterfaceInfo {
    ip: string;
    subnet: string;
}
declare function getLocalIpAndSubnet(): NetworkInterfaceInfo[];
declare function findLocalIpOnSameNetwork(targetIp: string): string | null;

export { findLocalIpOnSameNetwork, getLocalIpAndSubnet };
