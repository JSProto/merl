
let router = require('express').Router();

let stat = require('../lib/stat');
let db = require('../lib/db');
let _  = db._;


router.get('/list', (req, res) => {
    let message = [];

    db.vms.reduce((resolver, vm) => {

        // if (vm.state != 'running') return resolver;

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
        });
    });
});


router.get('/:id', (req, res, next) => {
    let name = req.params.id;
    let vm = _.getById(db.vms, name);
    let user = _.getById(db.users, name);

    stat(user)
        .then(json => {
            vm.game_time = json['cgt'];
            vm.merl_access = true;
            console.log(`${vm.name}: ${vm.game_time}`);

            db.saveVms();
            res.json({
                success: true,
                game_time: vm.game_time
            });
        })
        .catch(e => {
            console.log(`login (${vm.name}): ${e.message}`);
            message.push(`login (${vm.name}): ${e.message}`);
            vm.merl_access = false;

            db.saveVms();
            res.json({
                success: false,
                message: e.message
            });
        });
});

module.exports = router;