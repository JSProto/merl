
const needle = require('needle');

let db = require('./db');
let stat = require('./stat');
let VMC = require('./vmc');
let _  = db._;


function refreshVirtualMachine(){
	db.load();
	let promise = VMC.list(db.hosts);
	promise.then(db.refresh.bind(db)).catch(console.log);
	return promise;
}


module.exports  = function (app) {

	refreshVirtualMachine();

	app.use('/vm', (function(){

		let router = require('express').Router();

	    router.get('/:id/start', (req, res, next) => {
	        let vm = _.getById(db.vms, req.params.id);
	        VMC.get(vm).start().then(r => {
	        	if (r.success) {
	        		vm.state = 'running';
	        	}
	        	else {
	        		vm.state = 'poweroff';
	        	}
	        	db.saveVms();
	        	res.json(r);
	        }).catch(next);
	    });

	    router.get('/:id/stop', (req, res, next) => {
	        let vm = _.getById(db.vms, req.params.id);
	        VMC.get(vm).stop().then(r => {
	        	if (r.success) {
	        		vm.state = 'poweroff';
	        	}
	        	else {
	        		vm.state = 'running';
	        	}
	        	db.saveVms();
	        	res.json(r);
	        }).catch(next);
	    });

	    router.get('/:id/state', (req, res, next) => {
	        let vm = _.getById(db.vms, req.params.id);

	        VMC.get(vm).stop().then(r => {
	        	if (r.state === true) {
	        		vm.state = 'running';
	        	}
	        	else if (vm.state === false) {
	        		vm.state = 'poweroff';
	        	}
	        	else {
	        		vm.state = 'unknown';
	        	}
	        	db.saveVms();
	        	res.json(vm);
	        }).catch(next);
	    });

	    return router;
	})());

	app.all('/', (req, res) => {
	    res.render('index', {title: new Buffer('TWVybGltIHZtIGFkbWluaXN0cmF0aW9u', 'base64').toString()});
	});

	app.get('/list', (req, res) => {
	    res.json({
			success: true,
			list: db.vms
		});
	});

	app.get('/refresh', (req, res) => {
		refreshVirtualMachine().then((vms) => {
			let message = [];

	        db.vms.reduce((resolver, vm) => {

	        	if (vm.state != 'running') return resolver;

	        	let user = _.getById(db.users, vm.name);
	        	if (!user || !user.pass) return resolver;

	            return resolver
	            	.then(() => stat(user))
	            	.then(json => {
	            		vm.game_time = json['cgt'];
	            		vm.merl_access = true;
	                    console.log(`${vm.name}: ${vm.game_time}`);
	                })
	                .catch(e => {
	                	console.log(`login (${vm.name}): ${e.message}`);
	                	message.push(`login (${vm.name}): ${e.message}`);
	                	vm.merl_access = false;
	                });
	        }, Promise.resolve()).then(() => {

	        	db.saveVms();

				res.json({
					message,
					success: true,
					list: db.vms
				})
	        });

		});
	});
}

