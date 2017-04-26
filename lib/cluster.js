"use strict";

const virtualbox = require('virtualbox-soap');
const url = require('url');
const {IMachine, IVirtualBox} = virtualbox;

const ignoreErrors = function(promise, defaultValue) {
	return promise.catch(() => defaultValue);
};


class VBoxCluster extends Map {
	constructor(options) {
		super();

		this.options = options;
	}

	get[Symbol.toStringTag]() {
		return this.constructor.name;
	}

	* logon() {
		for (let options of this.options) {

			options = Object.assign({host: '', user: '', pass: ''}, options);
			let host = url.parse(options.host).hostname;

			try {
	        	console.log(`Connecting to the Virtual Box server ${host}...`);

				let WebsessionManager = yield virtualbox(options.host);
				let VirtualBox = yield WebsessionManager.logon(options.user, options.pass);

				this.set(host, VirtualBox);
			}
			catch (e) {
				console.log(`Host ${host} not connected. ${e.message}`);
			}
		}
	}

	* logoff() {
	    for (let [host, vbox] of this) {
	        yield vbox.logoff(host);
	    }

	    this.clear();
	}

	* fetch(groups = '/') {

		let machines = new Map;

	    for (let [host, vbox] of this) {
	    	machines.set(host, yield vbox.getMachinesByGroups(groups));
	    }

	    return machines
		// return [].concat(... yield machines);
	}

	* find(id, host = null){

		let machine = null;

		if (this.has(host)) {
			const VirtualBox = this.get(host);
			machine = yield VirtualBox.findMachine(id);
		}
		else {
		    for (let vbox of this.values()) {
				machine = yield vbox.findMachine(id);
				if (machine) break;
		    }
		}

		return machine;
	}
}

IVirtualBox.prototype.getSessionObject = function (){
	return this.__client.websessionManager.getSessionObject(this);
};

IVirtualBox.prototype.logoff = function (domainName){
    console.log(`Disconnected from the Virtual Box server [${domainName}]`);
	return this.__client.websessionManager.logoff(this);
};


IMachine.prototype.getDomainName = function (){
	return this.get('parent.host.domainName');
};

IMachine.prototype.getSessionObject = function (){
	return this.getParent().then(vbox => vbox.getSessionObject());
};
IMachine.prototype.getSession = function (){
	if (this.__session) {
		return Promise.resolve(this.__session);
	}
	return this.getSessionObject();
};
IMachine.prototype.setSession = function (session){
	return this.__session = session;
};

IMachine.prototype.lock = function* (type = 'Shared'){

	const sessionState = yield this.sessionState;

	// if (sessionState == 'Locked') {
	// 	return Promise.resolve(sessionState);
	// }

	const session = this.setSession(yield this.getSessionObject());

	return this.lockMachine(session, type);
};

IMachine.prototype.unlock = function* (){
	const session = yield this.getSession();
	if (session) {
		yield session.unlockMachine();
		this.setSession(null);
	}
};

IMachine.prototype.start = function* (mode){
	const session = yield this.getSession();
    const progress = yield this.launchVMProcess(
    	session, mode ? 'gui' : 'headless'
    );
    yield progress.waitForCompletion(-1);
};

IMachine.prototype.poweroff = function* () {

	const console = yield this.getConsole();
	const guest = yield console.getGuest();

	if (guest) {
		const guestSessions = yield ignoreErrors(guest.getSessions(), []);
		for (const session of guestSessions) {
			yield ignoreErrors(session.close());
		}
	}

	try {
		const powerDownProgress = yield console.powerDown();
		yield powerDownProgress.waitForCompletion(-1);
	} catch (e) {
		yield ignoreErrors(this.launchVMProcess(null, "emergencystop"));
	}
};

IMachine.prototype.getConsole = function* () {
	return yield this.getSession().then(session => session.getConsole());
};


module.exports = VBoxCluster;