
const url = require('url');
const co = require('co');
const _ = require('lodash');
const cron = require('./schedule');


let limitWorkVM = 1;
let workTime = 45 * 60 * 1000;                 // minutes
let delayBetweenStartVM = 1 * 60 * 1000;       // minutes


class Rotator {

    static setup(application){
        this.cluster = application.cluster;
        this.application = application;
        this.db = application.db;

        this.hosts = this.cluster.options.filter(opt => opt.rotate).map(opt => {
            return url.parse(opt.host).hostname;
        });
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
        if (this.hosts.length) {
            console.log(`rotator: init on hosts ${this.hosts}`);
            Rotator.init();
        }
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
        if (this.hosts.includes(host))
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