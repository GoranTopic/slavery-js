import "../chunk-V6TY7KAL.js";
import Service from "../service/index.js";
const ServiceDiscoveryService = (host, port) => {
  return new Service({
    service_name: "ServiceDiscoveryService",
    peerServicesAddresses: [],
    mastercallback,
    slaveMethods: {
      registerService,
      getServices
    },
    options: {
      host,
      port: parseInt(port)
    }
  });
};
const mastercallback = async ({ self }) => {
  await self.set([]);
};
const registerService = async (service, { self }) => {
  let services = await self.get();
  services.push(service);
  await self.set(services);
  return "ok";
};
const getServices = async (params, { self }) => {
  return await self.get();
};
var ServiceDiscoveryService_default = ServiceDiscoveryService;
export {
  ServiceDiscoveryService_default as default
};
//# sourceMappingURL=ServiceDiscoveryService.js.map