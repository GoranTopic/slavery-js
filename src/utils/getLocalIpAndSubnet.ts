import * as os from 'os';
import * as ip from 'ip';

interface NetworkInterfaceInfo {
    ip: string;
    subnet: string;
}


function getLocalIpAndSubnet() : NetworkInterfaceInfo[] {
    const interfaces = os.networkInterfaces();
    const result = [];

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]!) {
            if (iface.family === 'IPv4' && !iface.internal) {
                result.push({ ip: iface.address, subnet: iface.netmask });
            }
        }
    }
    return result;
}

function isSameNetwork(localIp: string, localSubnet: string, targetIp: string) : boolean {
    const localSubnetInfo = ip.subnet(localIp, localSubnet);
    const targetSubnetInfo = ip.subnet(targetIp, localSubnet); // Using localSubnet for the mask
    return localSubnetInfo.networkAddress === targetSubnetInfo.networkAddress;
}

function findLocalIpOnSameNetwork(targetIp: string) : string | null {
    // if targetIp is localhost, use
    if(targetIp === 'localhost') targetIp = '127.0.0.1';
    // if targetIp is in the local network, return the local IP
    if (ip.isLoopback(targetIp) && ip.isPrivate(targetIp))
        return targetIp;
    // Otherwise, find the local IP on the same network
    const localNetworks = getLocalIpAndSubnet();
    // for each local network, check if the target IP is in the same network
    for (const network of localNetworks) {
        if (isSameNetwork(network.ip, network.subnet, targetIp)) {
            // return the local IP
            return network.ip;
        }
    }
    return null;
}


export { findLocalIpOnSameNetwork, getLocalIpAndSubnet };
