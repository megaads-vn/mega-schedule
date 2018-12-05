var ws = adonis.Ws().connect();

ws.on('open', () => {
    const activity = ws.subscribe('activitySchedule');

    activity.on('ready', () => {
        console.log('Subscribe Activity Schedule Event...');
        // activity.emit('clientEmit', {
        //     username: "MegaAds Schedule",
        //     body: "<tuananhzippy> kieutuananh1995@gmail.com </tuananhzippy>"
        // });
    });

    activity.on('error', (error) => {
        console.log("Activity Error", error);
    });

    activity.on('close', () => {
        console.log('Unsubscribe Activity Schedule Event...');
    });

    activity.on('scheduleRun', (message) => {
        console.log(message);
    })
})

ws.on('error', () => {
    console.log('Error Connect Web Socket!');
});

ws.on('close', () => {
    console.log('Disconnect Web Socket!');
});
