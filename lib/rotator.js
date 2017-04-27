

const _ = require('lodash');
const co = require('co');
const cron = require('./schedule');


let limitWorkVM = 1;
let workTime = 2 * 60 * 1000;                 // minutes
let delayBetweenStartVM = 30 * 1000;          // seconds


class Rotator {

    static setup(application){
        this.cluster = application.cluster;
        this.application = application;
        this.db = application.db;
    }

    static * rotate(vms, host){

        const filterRunning = {state: 'Running'};

        let runningMachines = vms.filter(filterRunning).value();
        let stoppedMachines = vms.reject(filterRunning).take(limitWorkVM - runningMachines.length).value();

        let processed = stoppedMachines.length ? stoppedMachines : runningMachines;

        // console.log(`Host ${host}, next stop: ${runningMachines.length}, next run: ${stoppedMachines.length}`);

        yield processed.map(MachineSchedule.factory);
    }

    static start(){
        console.log(`Start rotator`);
        Rotator.init();
    }
}


Rotator.init = _.throttle(co.wrap(function* (){

    yield* Rotator.application.actions.refresh();

    let grouped = _.chain(Rotator.db.vms)
        .reject({state: 'Disconnected'})
        .reject({state: 'Null'})
        .orderBy('lastStateChange', 'asc')
        .groupBy('host')
        .value();

    for (let host in grouped) {
        yield Rotator.rotate(_.chain(grouped[host]), host);
    }
}), 5000, {'leading': false});



class MachineSchedule {
    constructor(machine, i){
        this.machine = machine;
        this.index = i;
        return this.init();
    }

    static * factory(machine, index){
        return yield new MachineSchedule(machine, index);
    }

    * init(){
        const {state, lastStateChange} = this.getVM();
        const workedTime = Date.now() - lastStateChange;

        const delayStart = (this.index || .2) * delayBetweenStartVM;
        const delayStop = workedTime < workTime ? workTime - workedTime : 0;

        if (state == 'Running') {
            this.addScheduleStopAfter(delayStop);
        }
        else {
            this.addScheduleStartAfter(delayStart);
        }

        return this;
    }

    * startMachine () {
        let vm = this.getVM();

        const cluster = Rotator.cluster;
        const machine = yield cluster.find(vm.id, vm.host);

        let state = yield machine.state;

        if (state != 'Running') {
            yield* machine.start(true);
            state = yield machine.state;
            this.addScheduleStopAfter(workTime);
        }
        else {
            Rotator.init();
        }

        vm.state = state;
        Rotator.db.save();
    }

    * stopMachine() {
        let vm = this.getVM();

        const cluster = Rotator.cluster;
        const machine = yield cluster.find(vm.id, vm.host);

        let state = yield machine.state;

        if (state == 'Running') {
            yield machine.lock();
            yield machine.poweroff();
            yield machine.unlock();

            state = yield machine.state;
        }

        vm.state = state;
        Rotator.db.save();

        Rotator.init();
    }

    getVM(){
        const id = this.machine.id;
        return _.find(Rotator.db.vms, {id});
    }

    addScheduleStartAfter (delay = 0) {
        const {name, host} = this.getVM();
        return this.schedule(delay, {
            description: `start ${name} on ${host}`,
            method: 'startMachine'
        });
    }

    addScheduleStopAfter (delay = 0) {
        const {name, host} = this.getVM();
        return this.schedule(delay, {
            description: `stop ${name} on ${host}`,
            method: 'stopMachine'
        });
    }

    schedule (delay, options){
        const trigger = {start: delay + Date.now()};

        return cron.schedule(trigger, opts => {
            const job = co.wrap(this[opts.method].bind(this));
            job(opts).catch(e => console.log(e.stack));
        }, options);
    }
};


module.exports = Rotator;