
const _ = require('lodash');
const path = require('path');
_.mixin(require('underscore-db'));
// _.id = 'name';

const vmShema = function(rows){
	return Object.assign({
		state: '',
		merl_access: false,
	    today_downloads: 0,
	    today_time: '0:0:0',
	    today_banners: 0,
	    today_earning: 0,
	    total_downloads: 0,
	    total_time: '0:0:0',
	    total_banners: 0,
	    total_earning: 0,
		created_at: (new Date()).getTime(),
		lastStateChange: (new Date('2000')).getTime()
	}, rows);
}

const Database = {

	T_USERS: path.resolve('db', 'users.json'),
	T_VMS: path.resolve('db', 'vms.json'),

	users: [],
	vms: [],

	refresh: function (vms){
		this._refreshVirutalMachineList(vms);
		this._refreshUserList(vms);
	},

	_refreshVirutalMachineList: function (vms) {

		for (let box of vms) {
			let {id, name, state, host} = box;

			let updated = _.updateWhere(this.vms, {name}, box);

			let vm = updated.pop();

			if (updated.length) {
				updated.forEach(v => _.removeById(this.vms, v.id));
			}

			if (vm) {
				// console.log(`$ update machine ${name} (${state})`);
			}
			else {
				vm = _.insert(this.vms, vmShema(box));
				console.log(`$ add machine ${name} (${state})`);
			}
		}

		_.updateWhere(this.vms, vm => !_.find(vms, {name: vm.name}), {state: 'Disconnected'});

		this.save();
	},

	_refreshUserList: function (vms) {
		let count = this.users.length;

		vms.map(vm => {
			let user = _.find(this.users, {name: vm.name});
			if (!user) {
				console.log(`add user '${vm.name}'`);
				_.insert(this.users, {name: vm.name, pass: ''});
			}
		});

		let updated = this.users.length != count;
		if (updated) this.saveUsers();
	},

	resetAllGameTimers: function(){
		const vms = _.updateWhere(this.vms, null, {today_time: "0:0:0"});

		this.save();

		return vms.length;
	},

	load: function() {
		this.users = _.load(this.T_USERS);
		this.vms   = _.load(this.T_VMS);
	},
	save: function() {
		return _.save(this.vms, this.T_VMS);
	},
	saveUsers: function() {
		return _.save(this.users, this.T_USERS);
	}
};

module.exports = Database;
Database._ = _;
