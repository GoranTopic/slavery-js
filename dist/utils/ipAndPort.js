import "../chunk-V6TY7KAL.js";
import * as os from "os";
import * as ip from "ip";
import getPort from "get-port";
function getLocalIpAndSubnet() {
  const interfaces = os.networkInterfaces();
  const result = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        result.push({ ip: iface.address, subnet: iface.netmask });
      }
    }
  }
  return result;
}
function isSameNetwork(localIp, localSubnet, targetIp) {
  const localSubnetInfo = ip.subnet(localIp, localSubnet);
  const targetSubnetInfo = ip.subnet(targetIp, localSubnet);
  return localSubnetInfo.networkAddress === targetSubnetInfo.networkAddress;
}
function findLocalIpOnSameNetwork(targetIp) {
  if (targetIp === "localhost") targetIp = "127.0.0.1";
  if (ip.isLoopback(targetIp) && ip.isPrivate(targetIp))
    return targetIp;
  const localNetworks = getLocalIpAndSubnet();
  for (const network of localNetworks) {
    if (isSameNetwork(network.ip, network.subnet, targetIp)) {
      return network.ip;
    }
  }
  return null;
}
export {
  findLocalIpOnSameNetwork,
  getLocalIpAndSubnet,
  getPort
};
//# sourceMappingURL=ipAndPort.js.map