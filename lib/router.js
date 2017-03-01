
const needle = require('needle');

let db = require('./db');
let _  = db._;


module.exports  = function (app) {

	db.load();
	getAllVm().then(vms => db.refresh(vms));

	app.use('/vm', (function(){

		let router = require('express').Router();

	    router.get('/:id/start', (req, res, next) => {
	        db.load();
	        let vm = _.getById(db.vms, req.params.id);

	        needleGet(vm.host + '/?action=start&name=' + vm.name)
	            .then(r => res.json(r))
	            .catch(next)
	    });

	    router.get('/:id/stop', (req, res, next) => {
	        db.load();
	        let vm = _.getById(db.vms, req.params.id);

	        needleGet(vm.host + '/?action=stop&name=' + vm.name)
	            .then(r => res.json(r))
	            .catch(next)
	    });

	    router.get('/:id/state', (req, res, next) => {
	        db.load();
	        let vm = _.getById(db.vms, req.params.id);

	        needleGet(vm.host + '/?action=state&name=' + vm.name)
	            .then(r => {
	                r.state = r.state ? 'process' : 'stopped';
	                res.json(r);
	            })
	            .catch(next)
	    });

	    return router;
	})());

	app.all('/', (req, res) => {
	    res.render('index', {title: 'Merlim vm administration'});
	});

	app.get('/list', (req, res) => {
	    db.load();

	    res.json(db.vms);
	});
}


///// HELPERS

function getAllVm (){
    return new Promise((resolve, reject) => {
        let vms = [];

        db.hosts.reduce((resolver, host) => {
            return resolver.then(() => needleGet(host + '/?action=list'))
                .then(result => {
                    if (result.success) {
                        result.list.forEach(vm => (vm.host = host));
                        vms = vms.concat(result.list);
                    }
                })
                .catch(e => console.error(e));
        }, Promise.resolve()).then(() => resolve(vms));
    });
};

function needleGet(url) {
    return new Promise((resolve, reject) => {
        needle.get(url, (err, res, json) => err ? reject(err) : resolve(json));
    });
}