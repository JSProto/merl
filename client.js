const PORT = 8181;
const VBoxManage = process.platform == 'darwin'
	? '/usr/local/bin/VBoxManage' : '"%ProgramFiles%/Oracle/VirtualBox/VBoxManage.exe"';

const http = require('http');
const url = require('url');
const querystring = require('querystring');
const cp = require('child_process');


let router = {
	start: function(req, res) {

		let name = req.query.name;

		console.log(`start vm ${name}`);

		VBoxManager.get(name).start()
			.then(out => {
				let response = {success: false};

				if (out.includes('successfully started')) {
					response.success = true;
				}
				else {
					response.message = 'Unknown error';
				}

				console.log(`start vm ${name}: ${response.success}`);

				res.json(response);
			})
			.catch(e => {
				console.log('start vm error: ', e);

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

		VBoxManager.get(name).stop()
			.then(() => {
				console.log(`stop vm ${name}: true`);
				res.json({success: true});
			})
			.catch(e => {
				console.log('stop vm error: ', e);

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

		console.log(`state vm ${name}`);

		VBoxManager.get(name).info().then(function(out) {

			let info = VBoxManager.parseInfo(out);

			let state = info.state ? info.state.includes('running') : false;

			console.log(`state vm ${name}: ${info.state}`);

			res.json({
				success: true,
				state,
				time: info.time,
				message: info.state
			});
		}).catch(function(e) {
			console.log('state vm error: ', e);

			res.json({
				success: false,
				message: e.message
			});
		});
	},
	list: function(req, res) {
		const re = /\"([^\"]+)\"/g;

		console.log(`list vm`);

		VBoxManager.list().then(function(out) {
			let vms = re.match(out).map(r => r[1]);

			VBoxManager.list(true).then(function(out) {

				let running = re.match(out).map(r => r[1]);

				let list = vms.map(vm => {
					return {
						name: vm,
						state: running.includes(vm)
					};
				});

				console.log(`list vm count: ${list.length}`);

				res.json({
					success: true,
					list: list
				});

			}).catch(function(e) {
				console.log(`list vm (2) error: `, e);

				res.json({
					success: false,
					message: e.message
				});
			});
		}).catch(function(e) {
			console.log(`list vm (1) error: `, e);

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


class VBoxManager {
	constructor(name) {
		if (!name) throw new Error('VBoxManager: virtual machine name not defined');
		this.name = name;
	}

	start() {
		return exec(`${VBoxManage} startvm ${this.name}`);
	}

	stop() {
		return exec(`${VBoxManage} controlvm ${this.name} poweroff`);
	}

	info() {
		return exec(`${VBoxManage} showvminfo ${this.name}`);
	}

	static get(name) {
		return new VBoxManager(name);
	}

	static list(onlyRunning) {
		let type = (onlyRunning ? 'runningvms' : 'vms');
		return exec(`${VBoxManage} list ${type}`);
	}

	static parseInfo(string){
		const re = /([^:]+):(.+)/g;
		const reTime  = /([-T:0-9]+)\./;

		let info = re.match(string).reduce((mem, row) => {
			let key = row[1].trim().toLowerCase();
			let val = row[2].trim();
			if (key) mem[key] = val;
			return mem;
		}, {});

		let [m, time] = info.state.match(reTime);

		info.time = time;

		return info;
	}
}


function exec(command) {
	if (!command) throw new Error('exec: command not defined');

	return new Promise(function(resolve, reject) {
		cp.exec(command, (error, stdout, stderr) => (error ? reject(error) : resolve(stdout)));
	});
}

RegExp.prototype.match = function(string){
	let match, result = [];
	while (match = this.exec(string))
	    result.push(match);
	return result;
};

http.ServerResponse.prototype.json = function(object) {
	this.setHeader('Content-Type', 'application/json');
	return this.end(JSON.stringify(object));
};
