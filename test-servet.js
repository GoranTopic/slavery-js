import { Server } from "socket.io";
import { createServer } from "http";

// Specify the host and port
const host = '10.0.10.101';
const port = 3000;

let io;

let isLan = true;
if (isLan) {
    let server = createServer();
    io = new Server(server,  {
        cors: {
            origin: "*",
        },
    });
server.listen(port, host, () => {
    console.log(`server  is running on ${host}:${port}`);
});
} else {
    io = new Server(port, {
        cors: {
            origin: "*",
        },
    });
    console.log(`server  is running on ${port}`);
}



io.on("connection", (socket) => {
    console.log("A client connected:", socket.id);

    // get the client IP address
    const clientIpAddress = socket.handshake.host;
    console.log("Client IP address:", clientIpAddress);

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

