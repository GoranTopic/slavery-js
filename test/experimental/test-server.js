import { Server } from "socket.io";
import { createServer } from "http";
// Specify the host and port
const host = '10.0.10.0';
let port = 0;
let io;
let isLan = false;
if (isLan) {
    let server = createServer();
    io = new Server(server, {
        cors: {
            origin: "*",
        },
    });
    server.listen(port, host, () => {
        let address = server.address();
        if (address === null || typeof address === "string") {
            console.log("Server is not running");
            return;
        }
        else
            port = address.port;
        console.log(`server  is running on ${host}:${port}`);
    });
}
else {
    io = new Server(port, {
        cors: {
            origin: "*",
        },
    });
    // get the port
    port = io.httpServer.address().port;
    console.log(`server  is running on ${port}`);
}
io.on("connection", (socket) => {
    console.log("A client connected:", socket.id);
    console.log("Server IP Address:", getIp(socket));
    console.log("Server Port:", getPort(socket));
    console.log("Client IP Address:", getTargetIp(socket));
    // Listen for messages from the client
    socket.on("message", (data) => {
        console.log("Message received from client:", data);
        // Send a response back to the client
        socket.emit("message", "Hello from the server!");
    });
    // Handle client disconnection
    socket.on("disconnect", () => {
        console.log("A client disconnected:", socket.id);
    });
});
const getIp = (socket) => {
    const IpAddress = socket.handshake.headers.host.split(":")[0];
    return IpAddress;
};
const getPort = (socket) => {
    const port = socket.handshake.headers.host.split(":")[1];
    return port;
};
const getTargetIp = (socket) => {
    const ip = socket.handshake.address;
    return ip;
};
