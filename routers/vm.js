
const router = require('express').Router();
const co = require('co');

router.param('id', function (req, res, next, id) {
    const application = req.app.get('application');
    const db = req.app.get('db');

    let vm = db._.getById(db.vms, id);

    if (!vm) {
        return next(new Error('No vm matching ' + id));
    }

    res.success = false;

    co(function* (){
        const machine = yield application.cluster.find(id, vm.host);
        req.vm = vm;
        req.machine = machine;

        next();
    }).catch(function(e){
        console.log(e);
        next(new Error('No machine matching ' + id));
    });
});

router.all('/start/:id', function* (req, res) {
    let state = yield req.machine.state;

    if (state != 'Running') {
        yield* req.machine.start(true);
        state = yield req.machine.state;
    }

    req.vm.state = state;
    res.success = true;
});

router.all('/stop/:id', function* (req, res) {

    const machine = req.machine;

    let state = yield machine.state;
    let sessionState = yield machine.sessionState;

    console.log('state: ', state);

    if (state == 'Running') {
        yield machine.lock();
        yield machine.poweroff();
        yield machine.unlock();

        state = yield machine.state;
    }

    req.vm.state = state;
    res.success = true;
});

router.all('/state/:id', function* (req, res) {
    req.vm.state = yield req.machine.state;
    res.success = true;
});

router.all('*', function(req, res){
    const response = Object.assign({success: res.success}, req.vm);
    const db = req.app.get('db');
    db.save();
    res.json(response);
});


module.exports = router;