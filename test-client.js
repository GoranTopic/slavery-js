import { io } from "socket.io-client";

// Connect to the Socket.IO server
const socket = io("ws://localhost:46349");

// Listen for the connection event
socket.on("connect", () => {
    console.log("Connected to the server:", socket.id);

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
