
const needle = require('needle');

let db = require('../lib/db');
let VMC = require('../lib/vmc');
let _  = db._;



function refreshVirtualMachine(){
	db.load();
	let promise = VMC.list(db.hosts);
	promise.then(db.refresh.bind(db)).catch(console.log);
	return promise;
}


let router = require('express').Router();


router.all('/', (req, res) => {
    res.render('index', {title: new Buffer('TWVybGltIHZtIGFkbWluaXN0cmF0aW9u', 'base64').toString()});
});

router.get('/list', (req, res) => {
	refreshVirtualMachine().then(() => {
	    res.json({
			success: true,
			list: db.vms
		});
	}).catch(e => {
	    res.json({
			success: false,
			message: e.message,
			list: db.vms
		});
	});
});


let vm = require('./vm');
let merl = require('./merl');

// init all routers
module.exports = function (app) {
	refreshVirtualMachine();

	app.use('/', router);
	app.use('/vm', vm);
	app.use('/merl', merl);
}
