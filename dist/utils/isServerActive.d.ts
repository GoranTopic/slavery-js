/**
 * Checks if a Socket.IO server is running at the specified host and port.
 * @param host - The hostname or IP address of the server.
 * @param port - The port number on which the server is expected to be listening.
 * @param timeout - The maximum time to wait for a response from the server, in milliseconds.
 * @returns A promise that resolves to true if the server is running, otherwise false.
 */
declare function isServerActive({ name, host, port, timeout }: {
    name?: string;
    host: string;
    port: number;
    timeout?: number;
}): Promise<boolean>;

export { isServerActive as default };
