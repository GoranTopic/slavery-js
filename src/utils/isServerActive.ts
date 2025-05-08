import { log } from './index.js';
import { Connection } from '../network/index.js';

const resolve_timout_pointer = (timeout_pointer: NodeJS.Timeout | null) => {
    if (timeout_pointer) {
        clearTimeout(timeout_pointer);
        timeout_pointer = null;
    }
}

/**
 * Checks if a Socket.IO server is running at the specified host and port.
 * @param host - The hostname or IP address of the server.
 * @param port - The port number on which the server is expected to be listening.
 * @param timeout - The maximum time to wait for a response from the server, in milliseconds.
 * @returns A promise that resolves to true if the server is running, otherwise false.
 */
async function isServerActive({ name, host, port, timeout }: {
    name?: string, host: string, port: number, timeout?: number
}): Promise<boolean> {
    if(timeout === undefined) {
        timeout = 5000; // Default timeout of 5 seconds
    }
    return new Promise((resolve) => {
        let timeout_pointer: NodeJS.Timeout | null = null;
        const connection = new Connection({
            host, port, id: 'connection_test' + Math.random(),
            options: {
                timeout: 10000, // Increased timeout (e.g. 10 second
                onConnect: (connection: Connection) => {
                    // clear the timeout if the connection is successful
                    connection.close();
                    resolve_timout_pointer(timeout_pointer);
                    resolve(true);
                }
            }

        });
        connection.on('connect_error', () => {
            //console.log(`Connection error to ${name} at ${host}:${port}`);
        });

        connection.on('connect_timeout', () => {
            //console.log(`Connection timeout to ${name} at ${host}:${port}`);
            resolve(false);
            connection.close();
            resolve_timout_pointer(timeout_pointer);
        });
        connection.connected();
        // Optional: set a manual timeout fallback, in case events fail to fire
        timeout_pointer = setTimeout(() => {
            console.error(`Timeout waiting for ${name} at ${host}:${port}`);
            connection.close();
            resolve(false);
        }, timeout);
    });
}


export default isServerActive
