import * as net from 'net';

/**
 * Check if a port is available on a given host
 * @param port - Port number to check
 * @param host - Host to check the port on
 * @returns A promise that resolves to true if the port is available, false if not
 */
function isPortAvailable(port: number, host: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
        resolve(false); // Port is in use or access denied
      } else {
        reject(err); // Some other error
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true); // Port is available
    });

    server.listen(port, host);
  });
}

/**
 * Find all available ports within a range on a given host
 * @param startPort - Starting port number
 * @param endPort - Ending port number
 * @param host - Host to check the ports on
 * @returns A promise that resolves to an array of available ports
 */
async function findAvailablePorts(
    startPort: number, endPort: number, host?: string
): Promise<number[]> {
    const availablePorts: number[] = [];

  for (let port = startPort; port <= endPort; port++) {
    try {
      const available = await isPortAvailable(port, host);
      if (available) {
        availablePorts.push(port);
      }
    } catch (err) {
      console.error(`Error checking port ${port}:`, err);
    }
  }

  return availablePorts;
}


export default findAvailablePorts;
