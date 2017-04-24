

const co = require("co");
const unload = require('unload');
const minimist = require('minimist');
const server = require("./server");
const argv = minimist(process.argv.slice(2));

global.application = require("./application");

const appClose = application.actions.close;
application.actions.close = function* () {
    console.log();
    const httpServer = application.httpServer;
    if (httpServer) {
        console.log("Shutting down the http server...");
        application.httpServer = null;
        yield new Promise(function (resolve) {
            httpServer.close(resolve);
        });
    }

    yield appClose();
};


unload.add(co.wrap(function* (err){
    if (err) {
        console.log(err)
    }

    yield application.actions.close();
}));

co(function* (){
    application.db.load();

    yield application.cluster.logon();
    yield* application.actions.keepAlive();
    yield* application.actions.refresh(true);

    application.httpServer = server(application);

    if (argv.cron) {
        require("./cron")(application);
    }
}).catch(e => {
    console.log('ERROR: ', e.code, e.message);
    console.log(e.stack);
});
