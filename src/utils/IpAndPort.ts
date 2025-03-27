import * as os from 'os';
import * as ip from 'ip';
import getPort from 'get-port';
import { Connection } from '../network';

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


/**
 * Checks if a Socket.IO server is running at the specified host and port.
 * @param host - The hostname or IP address of the server.
 * @param port - The port number on which the server is expected to be listening.
 * @returns A promise that resolves to true if the server is running, otherwise false.
 */
async function isActive({ host, port }: { host: string, port: string }) : Promise<boolean> {
    return new Promise((resovle) => {
        const connection = new Connection({
            host, port: parseInt(port), id: 'test' + Math.random(),
            //onConnect: () => resovle(true)
        });
        connection.on('connect', () => {
            resovle(true);
            connection.close();
        });
        connection.on('connect_error', () => {
            resovle(false);
            connection.close();
        });
        connection.on('connect_timeout', () => {
            resovle(false);
            connection.close();
        });
    });
}



export { findLocalIpOnSameNetwork, getLocalIpAndSubnet, getPort, isActive };
