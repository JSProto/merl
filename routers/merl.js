
const router = require('express').Router();

const stat = require('../lib/stat');
const db = require('../lib/db');
const _  = db._;


router.all('/list', (req, res) => {
    let message = [];
    let vms = db.vms;
    let ids = req.body.ids && req.body.ids.length ? req.body.ids : null;

    if (ids) {
        vms = db.vms.filter(vm => ids.includes(vm.name));
    }

    vms.reduce((resolver, vm) => {

        if (!ids && vm.state != 'running') return resolver;

        let user = _.getById(db.users, vm.name);
        if (!user || !user.pass) return resolver;

        return resolver
            .then(() => stat(user))
            .then(json => {
                let time = (new Date()).toISOString();

                Object.assign(vm, json);

                vm.merl_access = true;
                console.log(`$ merl: ${time} ${vm.name}: ${vm.today_time}`);
            })
            .catch(e => {
                console.log(`login (${vm.name}): ${e.message}`);
                message.push(`login (${vm.name}): ${e.message}`);
                vm.merl_access = false;
            });
    }, Promise.resolve()).then(() => {

        db.save();

        res.json({
            message,
            success: true,
            list: db.vms
        });
    });
});


router.get('/reset-game-time', (req, res) => {
    res.json({
        success: true,
        count: db.resetAllGameTimers()
    });
});

/*
, */

router.get('/:id', (req, res, next) => {
    let name = req.params.id;
    let vm = _.getById(db.vms, name);
    let user = _.getById(db.users, name);

    stat(user)
        .then(json => {

            Object.assign(vm, json);

            vm.merl_access = true;
            console.log(`${vm.name}: ${vm.today_time}`);

            db.save();
            res.json({
                success: true,
                today_time: vm.today_time
            });
        })
        .catch(e => {
            console.log(`login (${vm.name}): ${e.message}`);
            message.push(`login (${vm.name}): ${e.message}`);
            vm.merl_access = false;

            db.save();
            res.json({
                success: false,
                message: e.message
            });
        });
});

module.exports = router;
