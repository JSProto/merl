
const co = require('co');
const path = require('path');

const hosts = require(path.resolve('db', 'hosts.json'));
const Cluster = require(path.resolve('lib', 'cluster.js'));

let keepAliveTimeout = null;

const vboxClearKeepAlive = function () {
    if (keepAliveTimeout) {
        clearTimeout(keepAliveTimeout);
    }
};


module.exports = function(application){

    const cluster = new Cluster(hosts);

    application.actions = {
        close: function* () {
            vboxClearKeepAlive();
            yield* cluster.logoff();
        },
        keepAlive: function* () {
            vboxClearKeepAlive();
            for (let vbox of cluster.values()) {
                let versions = yield vbox.version;
            }
            vboxClearKeepAlive();
            keepAliveTimeout = setTimeout(co.wrap(this.keepAlive), 90000); // 1 min 30s
        },
        refresh: function* (){
            const vboxes = yield* cluster.fetch();
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
    };

    return cluster;
};
