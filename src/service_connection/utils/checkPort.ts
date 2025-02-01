import io from 'socket.io-client';

let timeout = 3000;

function checkSocketIO(host: string, port: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const url = `http://${host}:${port}`;
    const socket = io(url, {
      timeout,
      reconnection: false
    });
    // connect to the socket
    socket.on('connect', async () => {
        // set timeout to for 3 seconds
        let timeout = setTimeout(() => {
            socket.disconnect();
            resolve(false);
        }, 3000);
        // get the response from the primary service
        socket.on('is_service', serviceType => {
            clearTimeout(timeout);
            socket.disconnect();
            resolve(serviceType === serviceName);
        });
        // send message to the primary service
        socket.emit('is_sevice');
    });
    // if the connection is not established
    socket.on('connect_error', (err) => {
      socket.disconnect();
      resolve(false);
    });
    // if the connection is not established
    socket.on('error', (err) => {
      socket.disconnect();
      resolve(false);
    });
  });
}

export default checkSocketIO;
