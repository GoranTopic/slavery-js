import Service from './types/Service';
import checksocket from './utils/checkPrimaryServiceSocket'
import findAvailablePort from '../utils/findAvailablePorts';

class Primary extends Service {
    /* this is the class that will create primary service,
     * find the services. */
    constructor(name, port, socket) {
        super(name, port, socket);
        this.services = [];
        let availablePorts = findAvailablePort(initialPort);
        
    }

    


}

export default Primary;
     
