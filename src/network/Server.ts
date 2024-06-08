import { Server } from "socket.io";
import { createServer } from "http";
import { 


class Server {
  private io: Server;
  private host: string;
  private port: number;
  private maxTransferSize: number;
  public name: string;
  public id: string;
  public isOverLand: boolean;
  public connectionCallback: any;

  constructor({ host, port, maxTransferSize, name, id, isOverLand }) {
    this.io = new Server(createServer());
    this.host = host || "localhost";
    this.port = port || 3000;
    this.maxTransferSize = maxTransferSize || 1e9;
    this.name = name;
    this.isOverLand = isOverLand;
    this.id = id;
    this.connectionCallback = null;
    // initiate the server
    if(
  }

  init() {
      // create a new socket.io client instance
      this.io.on("connection", this._handleSocketConnection.bind(this));
      this.io.on("reconnect", () => log("[master] on reconnect triggered"));
  }


  async exit() {
      // broadcast exit to all slaves
      this.io.emit('_exit');
      // close all sockets
      this.io.close();
      // close all processes
      process.send('exit');
      // exit process
      process.exit();
  }

  async _handleSocketConnection(socket) {


  }

}
