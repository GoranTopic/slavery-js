const apiListener = (process, master) => {
    process.on('message', ({ msg }) => {
        //console.log('running on from master', msg)
        if (msg === 'areYouMaster?')
            process.send('I am master')
    });
}

export default apiListener;
