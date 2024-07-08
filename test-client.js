import { io } from "socket.io-client";
import os from 'os';
import ip from 'ip';


// localhost address
let serverIp = "10.0.10.101";
let serverPort = 39791

// Connect to the Socket.IO server
const socket = io(`ws://${serverIp}:${serverPort}`, {
    reconnection: true,
    transports: ["websocket"],
});

// Listen for the connection event
socket.on("connect", () => {
    console.log("Connected to the server:", socket.id);

    const localIp = findLocalIpOnSameNetwork(serverIp);
    if (localIp) {
        console.log(`Local IP on the same network: ${localIp}`);
    } else {
        console.log('No matching network found.');
    }

    // Send a message to the server
    socket.emit("message", "Hello from the client!");

    // Listen for messages from the server
    socket.on("message", (data) => {
        console.log("Message received from server:", data);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log("Disconnected from the server");
    });
});


const getIp = socket => {
    const IpAddress = socket.handshake.headers.host.split(":")[0];
    return IpAddress;
}

const getPort = socket => {
    const port = socket.handshake.headers.host.split(":")[1];
    return port;
}

const getTargetIp = socket => {
    const ip = socket.handshake.address;
    return ip;
}

const getTargetPort = socket => {
    const port = socket.handshake
    return port;
}

function getLocalIpAndSubnet() {
    const interfaces = os.networkInterfaces();
    const result = [];

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                result.push({ ip: iface.address, subnet: iface.netmask });
            }
        }
    }
    return result;
}

function isSameNetwork(localIp, localSubnet, targetIp) {
    const localSubnetInfo = ip.subnet(localIp, localSubnet);
    const targetSubnetInfo = ip.subnet(targetIp, localSubnet); // Using localSubnet for the mask
    return localSubnetInfo.networkAddress === targetSubnetInfo.networkAddress;
}

function findLocalIpOnSameNetwork(targetIp) {
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
