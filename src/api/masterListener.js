const apiListener = (process, master) => {
    process.on('message', ({ msg }) => {
        // make case statement for each
        switch (msg) {
            case 'areYouMaster?':
                process.send('I am master')
                break;
            default:
                throw new Error('Invalid message from primary process');
        }
    });
}

export default apiListener;
