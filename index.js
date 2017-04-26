

const co = require('co');
const unload = require('unload');
const minimist = require('minimist');
const server = require('./app/server');
const vboxcluster = require('./app/vboxcluster')
const argv = minimist(process.argv.slice(2));

const db = require('./lib/db');

const application = {
    db, config: {},
    httpServer: null
};

global.application = application;


unload.add(co.wrap(function* (err){
    if (err) {
        console.log(err)
    }

    yield application.actions.close();
}));

co(function* (){
    application.db.load();

    application.cluster = vboxcluster(application);

    yield application.cluster.logon();
    yield* application.actions.keepAlive();
    yield* application.actions.refresh();

    application.httpServer = server(application);

    if (argv.cron) {
        require("./app/cron")(application);
    }
}).catch(e => {
    console.log('ERROR: ', e.code, e.message);
    console.log(e.stack);
});
