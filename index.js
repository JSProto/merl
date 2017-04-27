

const co = require('co');
const unload = require('unload');
const minimist = require('minimist');
const rotator = require('./lib/rotator');
const cron = require("./apps/cron");
const server = require('./apps/server');
const vboxcluster = require('./apps/vboxcluster');

const argv = minimist(process.argv.slice(2));

const db = require('./lib/db');

const application = {
    db, rotator,
    config: {},
    actions: {},
    httpServer: null
};

global.application = application;


unload.add(co.wrap(function* (err){
    if (err) {
        console.log(err)
    }

    yield new Promise(resolve => {
        const httpServer = application.httpServer;
        if (httpServer) {
            application.httpServer = null;
            httpServer.close(resolve);
        };
    });

    yield application.cluster.close();
}));


co(function* (){
    application.db.load();

    cron(application);

    application.cluster = vboxcluster(application);

    yield application.cluster.logon();
    yield* application.cluster.keepAlive();
    yield* application.actions.refresh();

    application.httpServer = server(application);

    application.rotator.setup(application);

    if (argv.rotate) {
        application.rotator.start();
    }
}).catch(e => {
    console.log('ERROR: ', e.code, e.message);
    console.log(e.stack);
});
