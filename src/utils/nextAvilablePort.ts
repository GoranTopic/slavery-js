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
 * Find the next available port starting from a given port on a specified host
 * @param startPort - Starting port number
 * @param host - Host to check the ports on
 * @returns A promise that resolves to the next available port number
 */
async function findNextAvailablePort(startPort: number, host: string): Promise<number> {
  let port = startPort;

  while (true) {
    const available = await isPortAvailable(port, host);
    if (available) {
      return port;
    }
    port++;
  }
}

export default findNextAvailablePort;

