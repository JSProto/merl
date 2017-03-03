
const needle = require('needle');

let db = require('../lib/db');
let VMC = require('../lib/vmc');
let _  = db._;


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
    		vm.down_time = (new Date()).toISOString();
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


module.exports = router;

