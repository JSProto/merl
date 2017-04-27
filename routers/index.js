const router = require('express').Router();

// init all routers
module.exports = function (app) {

	router.all('/', function (req, res) {
	    res.render('index', {title: new Buffer('TWVybGltIHZtIGFkbWluaXN0cmF0aW9u', 'base64').toString()});
	});

	router.get('/rotate', function* (req, res) {
		const application = app.get('application');
    	application.rotator.start();
	    res.json({success: true});
	});

	router.get('/refresh', function* (req, res) {
		const application = app.get('application');
	    yield* application.actions.refresh();
		res.json({success: true, list: application.db.vms});
	});

	router.get('/list', function* (req, res) {
		const application = app.get('application');
		yield* application.actions.refresh();
		const db = app.get('db');
	    res.json({success: true, list: db.vms});
	});

	app.use('/', router);
	app.use('/vm', require('./vm'));
	app.use('/merl', require('./merl'));
}
