
let _ = require('lodash');
_.mixin(require('underscore-db'));
_.id = 'name';

let db = {

	T_USERS: './db/users.json',
	T_HOSTS: './db/hosts.json',
	T_VMS: './db/vms.json',

	users: [],
	hosts: [],
	vms: [],


	_refreshVirutalMachineList: function(vms) {

		vms.map(vm => {
			let {name, state, host} = vm;

			state = (state === true
				? 'process' : (state === false
					? 'stopped' : 'unknown'));

			let user = _.getById(this.users, name);
			let pass = user ? user.pass : '';

			vm = _.updateById(this.vms, name, {state, host, pass});

			if (!vm) {
				vm = _.insert(this.vms, {
					name, state, pass,
					game_time: "0:0:0",
					down_time: "2000-01-01T00:00:00"
				});
			}
		});

		this.vms.forEach(vm => {
			if(!_.getById(vms, vm.name)) vm.state = 'unknown';
		});

		this.saveVms();
	},

	_refreshUserListIfExistsNew: function(vms) {
		let count = this.users.length;

		vms.map(vm => {
			let user = _.getById(this.users, vm.name);
			if (!user) {
				console.log(`add user '${vm.name}'`);
				_.insert(this.users, {name: vm.name, pass: ''});
			}
		});

		let updated = this.users.length != count;
		if (updated) this.saveUsers();

		return this;
	},

	refresh: function(vms){
		this._refreshVirutalMachineList(vms);
		this._refreshUserListIfExistsNew(vms);
	},

	load: function() {
		this.users = _.load(this.T_USERS);
		this.hosts = _.load(this.T_HOSTS);
		this.vms = _.load(this.T_VMS);
	},
	saveVms: function() {
		return _.save(this.vms, this.T_VMS);
	},
	saveUsers: function() {
		return _.save(this.users, this.T_USERS);
	}
};

module.exports = db;
db._ = _;
