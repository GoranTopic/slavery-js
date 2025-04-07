interface Listener {
    event: string;
    parameters?: Array<any>;
    callback: Function;
}

export default Listener;
