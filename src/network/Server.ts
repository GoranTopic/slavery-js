import { Server } from "socket.io";
import { createServer } from "http";
import { Socket } from "socket.io";
import Connection from "./Connection";


class ServerSocketIO {
    /* this class will handle the logic managing the server conenctions with clilent, 
     * it will keep track of the node id and it will handle connection and dicoections
     */
  private io: Server;
  private host: string;
  private port: number;
  private maxTransferSize: number;
  private connections: Connection[];
  public name: string;
  public id: string;
  
  public isOverLan: boolean;
  public connectionCallback: any;
  private ioOptions: any;

  constructor({ host, port, maxTransferSize, name, id, isOverLand }: any) {
      this.host = host || "localhost";
      this.port = port || 3000;
      this.maxTransferSize = maxTransferSize || 1e9;
      this.name = name;
      this.isOverLan = this.host !== 'localhost'
      this.id = id;
      this.connectionCallback = null;
      this.connections = [];
      this.ioOptions = {
          maxHttpBufferSize: this.maxTransferSize,
      };
      // initiate the server
      if(this.isOverLan){
          this.io = new Server(createServer(), this.ioOptions);
      }else{
          this.io = new Server(this.port, this.ioOptions);
      }
      // create a new socket.io client instance
      this.io.on("connection", this._handleConnection.bind(this));
      this.io.on("reconnect", () => console.log("[master] on reconnect triggered"));
  }

  _handleConnection(socket: Socket) {
      // make a new connectection instance
      let connection = new Connection(socket);
      // add connection to pool
      this.connections.push(connection);
      // run callback
      if(this.connectionCallback)
          this.connectionCallback(connection);
  }

  getConnections() { 
      return this.connections;
  }

  async exit() {
      // broadcast exit to all slaves
      this.io.emit('_exit');
      // close all sockets
      this.io.close();
      // exit process
      process.exit();
  }

  }
