const PORT = 8181;

const http = require('http');
const url = require('url');
const querystring = require('querystring');

let router = {
	start: function(req, res) {

		let name = req.query.name;

		console.log(`start vm ${name}`);

		VBox.factory(name).start()
			.then(out => {
				let response = {success: false};

				if (out.includes('successfully started')) {
					response.success = true;
				}
				else {
					response.message = 'Unknown error';
				}

				res.json(response);
			})
			.catch(e => {

				let response = {
					success: false,
					message: e.message
				};

				if (e.message.includes('is already locked')) {
					response.success = true;
				}

				res.json(response);
			});
	},
	stop: function(req, res) {
		let name = req.query.name;

		console.log(`stop vm ${name}`);

		VBox.factory(name).stop()
			.then(() => res.json({success: true}))
			.catch(e => {
				let response = {
					success: false,
					message: e.message
				};

				if (e.message.includes('is not currently running')) {
					response.success = true;
				}

				res.json(response);
			});
	},
	state: function(req, res) {

		let name = req.query.name;

		VBox.factory(name).info().then(function(info) {

			let state = info.state ? info.state.includes('running') : null;

			console.log(`state vm ${name}: ${info.state}`);

			res.json({
				success: true,
				state,
				time: info.time,
				message: info.state
			});
		}).catch(function(e) {

			res.json({
				success: false,
				message: e.message
			});
		});
	},
	list: function(req, res) {
		VBox.list().then(Object.values).then(function(vms) {

			vms.forEach(vm => vm.state = vm.running);

			res.json({
				success: true,
				list: vms
			});

		}).catch(function(e) {

			res.json({
				success: false,
				message: e.message
			});
		});
	}
};

http.createServer(server).listen(PORT);
console.log('start server on port', PORT);


////// LIB

function server(request, response) {
	let {headers, method} = request;
	let {pathname, query} = url.parse(request.url);
	query = querystring.parse(query);

	if (pathname == '/favicon.ico') {
		response.statusCode = 200;
		return response.end('');
	}

	request.on('error', err => {
		console.error('request', err);
		response.json({
			success: false,
			message: err.message
		});
	});

	response.on('error', err => {
		console.error('response', err);
		response.statusCode = 500;
		response.json({
			success: false,
			message: err.message
		});
	});

	request.query = query;

	if (query.action in router) {
		try {
			response.statusCode = 200;
			router[query.action](request, response);
		} catch (err) {
			console.log(err);
			response.statusCode = 500;
			response.json({
				success: false,
				message: err.message
			});
		}
	}
	else {
		response.statusCode = 404;
		response.json({
			success: false,
			message: `action '${query.action}' not found`
		});
	}
}


http.ServerResponse.prototype.json = function(object) {
	this.setHeader('Content-Type', 'application/json');
	return this.end(JSON.stringify(object));
};


///// VBox module
const exec = require('child_process').exec;
const vBoxManageBinary = (function(platform){
	if (/^win/.test(platform)) {
		let vBoxInstallPath = process.env.VBOX_INSTALL_PATH || process.env.VBOX_MSI_INSTALL_PATH;
		return '"' + vBoxInstallPath + '\\VBoxManage.exe' + '"';
	}

	if (/^darwin/.test(platform) || /^linux/.test(platform)) {
		return 'vboxmanage';
	}

	return 'vboxmanage';
})(process.platform);


class VBox {
	constructor(vmname) {
		if (!vmname) throw new Error('VBox: virtual machine name not defined');
		this._name = vmname;
	}

	info() {
		return VBox.manage(`showvminfo "${this._name}"`).then(parse_infodata);
	}

	pause() {
		console.info('Pausing VM "%s"', this._name);
		return VBox.manage(`controlvm "${this._name}" pause`);
	}

	reset() {
		console.info('Resetting VM "%s"', this._name);
		return VBox.manage(`controlvm "${this._name}" reset`);
	}

	resume() {
		console.info('Resuming VM "%s"', this._name);
		return VBox.manage(`controlvm "${this._name}" resume`);
	}

	start(useGui = false) {
		useGui = ' --type ' + (useGui ? 'gui' : 'headless');

		console.info('Starting VM "%s" with options:', this._name, useGui);
		return VBox.manage(`-nologo startvm "${this._name}" ${useGui}`);
	}

	stop() {
		console.info('Stopping VM "%s"', this._name);
		return VBox.manage(`controlvm "${this._name}" savestate`);
	}

	savestate() {
		console.info('Saving State (alias to stop) VM "%s"', this._name);
		return this.stop();
	}

	poweroff() {
		console.info('Powering off VM "%s"', this._name);
		return VBox.manage(`controlvm "${this._name}" poweroff`);
	}

	isRunning() {
		return VBox.manage(`list runningvms`).then(stdout => {
			console.info('Checking virtual machine "%s" is running or not', this._name);
			return stdout.indexOf(this._name) !== -1;
		});
	}

	static version() {
		return VBox.manage(' --version').then(stdout => String(stdout.split(".")[0]).trim());

		// console.info("Virtualbox version detected as %s", VBox.version());
	}

	static manage(cmd) {

		if (!cmd) throw new Error('VBox.manage: cmd not defined');

		return new Promise(function(resolve, reject) {

			exec(`${vBoxManageBinary} ${cmd}`, function(err, stdout, stderr) {

				if (err) {
					err.stdout = stdout;
					err.stderr = stderr;
				}

				if (err && /VBOX_E_INVALID_OBJECT_STATE/.test(err.message)) {
					err = undefined;
				}

				if (!err && stderr && cmd.indexOf("pause") !== -1 && cmd.indexOf("savestate") !== -1) {
					err = new Error(stderr);
				}

				if (err) {
					console.error(err);
				}

				return (err ? reject(err) : resolve(stdout));
			});
		});
	}

	static list() {
		return VBox.manage('list runningvms').then(parse_listdata).then(runningvms => {
			return VBox.manage('list vms').then(parse_listdata).then(vms => {
				let length = Object.keys(vms).map(key => vms[key].running = key in runningvms).length;
				console.info('Listing VMs:', length);
				return vms;
			});
		});
	}

	static factory(name) {
		return new VBox(name);
	}
}

function parse_listdata(stdout) {
	return stdout.split(/\r?\n/g)
		.map(line => line.match(/^"(.+)" \{(.+)\}$/))
		.filter(matches => matches && matches.length === 3)
		.reduce(function(data, matches){
			let key = matches[2].toString();
			let name = matches[1].toString();
			data[key] = {name};
			return data;
		}, {});
}

function parse_infodata(stdout){
	const re = /([^:]+):(.+)/g;
	const reTime  = /([-T:0-9]+)\./;

	let info = re.match(stdout).reduce((mem, row) => {
		let key = row[1].trim().toLowerCase();
		let val = row[2].trim();
		if (key) mem[key] = val;
		return mem;
	}, {raw: stdout});

	let [m, time] = info.state.match(reTime);

	info.state_time = time;

	return info;
}

RegExp.prototype.match = function(string){
	let match, result = [];
	while (match = this.exec(string))
	    result.push(match);
	return result;
};

VBox.version().then(version => {
	VBox.ver = version;
	console.info("Virtualbox version detected as %s", version);
});
