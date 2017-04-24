
const co = require('co');
const db = require('./lib/db');
const hosts = require("./db/hosts.json");
const VBoxCluster = require("./lib/vboxcluster");

const application = {
    config: {},
    db: db,
    actions: {},
    httpServer: null,
    cluster: new VBoxCluster(hosts)
};

let keepAliveTimeout = null;

const appClearKeepAlive = function () {
    if (keepAliveTimeout) {
        clearTimeout(keepAliveTimeout);
    }
};

const appClose = function* () {
    appClearKeepAlive();
    yield* application.cluster.logoff();
};

const appKeepAlive = function* () {
    appClearKeepAlive();
    for (let vbox of application.cluster.values()) {
        let versions = yield vbox.version;
    }
    appClearKeepAlive();
    keepAliveTimeout = setTimeout(co.wrap(appKeepAlive), 90000); // 1 min 30s
};

const appVboxRefresh = function* (){
    const vboxes = yield* application.cluster.fetch();
    let vms = [];

    for (let [host, boxes] of vboxes) {
        for (let box of boxes) {
            let obj = yield* box.toPlainObject('id', 'name', 'state', 'lastStateChange');
            obj.host = host;
            vms.push(obj);
        }
    }

    application.db.refresh(vms);
}

application.actions = {
    close: appClose,
    keepAlive: appKeepAlive,
    refresh: appVboxRefresh
};

module.exports = application;
