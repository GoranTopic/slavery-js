import io from 'socket.io-client';


class Socket {
    /* keep tack of the
     * how this connection is to
    * conenction, the listeners and the available emitters */


    private socket: io.Socket;


    constructor(
    : { 
            isOverLan: boolean
        }) {

        this.socket = io('http://localhost:3000');
    }

    public on(event: string, callback: Function): void {
        this.socket.on(event, callback);
    }

    public emit(event: string, data: any): void {
        this.socket.emit(event, data);
    }
}
