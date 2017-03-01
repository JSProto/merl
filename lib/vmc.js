
const needle = require('needle');

function get(url) {
    return new Promise((resolve, reject) => needle.get(url, (err, res, json) => err ? reject(err) : resolve(json)));
}

class VMC {
	constructor(vm) {
		if (!vm.name) throw new Error('VMC: virtual machine name is not defined');
		if (!vm.host) throw new Error('VMC: virtual machine host is not defined');

		this.host = vm.host;
		this.name = vm.name;
	}

	start() {
		return get(`${this.host}/?action=start&name=${this.name}`);
	}

	stop() {
		return get(`${this.host}/?action=stop&name=${this.name}`);
	}

	info() {
		return get(`${this.host}/?action=state&name=${this.name}`);
	}

	static get(vm) {
		return new VMC(vm);
	}

	static list(hosts) {
	    return new Promise((resolve, reject) => {
	        let vms = [];

	        hosts.reduce((resolver, host) => {
	            return resolver
	            	.then(() => get(host + '/?action=list'))
	            	.then(result => {
	                    if (result.success) {
	                        result.list.forEach(vm => {
	                        	vm.host = host;
	                        	vms.push(vm);
	                        });
	                    }
	                })
	                .catch(console.error);
	        }, Promise.resolve()).then(() => resolve(vms));
	    });
	}
}

module.exports = VMC;
