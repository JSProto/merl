
const path = require('path');

const hosts = require(path.resolve('db', 'hosts.json'));
const Cluster = require(path.resolve('lib', 'cluster.js'));

module.exports = function(application){

    const cluster = new Cluster(hosts);

    application.actions = {
        refresh: function* (){
            const vboxes = yield* cluster.fetch('/work');
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
