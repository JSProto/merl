

const PORT = 8181;
const VBoxManage = 'C:/Program Files/Oracle/VirtualBox/VBoxManage';


let vm = {
	Roman7788: true,
	Natali777: true,
	Maria7: false,
	Pavlo7: false,
	arsen: false,
	leto777: false,
};

const http = require('http');
const url = require('url');
const querystring = require('querystring');

let router = {
	start: function(req, res){
		let name = req.query.name;
		let args = 'startvm ' + name;

		console.log('start vm ' + name);

		if (!name) throw new Error(`'name' not defined`);

		if (name in vm) {
			vm[name] = true;
		}
		else {
			throw new Error(`vm '${name}' not found`);
		}

		res.json({
			success: true
		});
	},
	stop: function(req, res){

		let name = req.query.name;
		let args = `controlvm ${name} poweroff`;

		console.log('stop vm ' + name);

		if (!name) throw new Error(`'name' not defined`);

		if (name in vm) {
			vm[name] = false;
		}
		else {
			throw new Error(`vm '${name}' not found`);
		}

		res.json({
			success: true
		});
	},
	status: function(req, res){
		let name = req.query.name;
		let args = `status ${name}`;

		let status = null;

		if (name in vm) {
			status = vm[name]
		}

		res.json({
			success: true,
			status: status
		});
	},
	list:  function(req, res){
		let args = `list`;

		let list = [];

		Object.keys(vm).forEach(v => {
			list.push({
				name: v,
				status: vm[v]
			});
		});

		res.json({
			success: true,
			list: list
		});
	}
};


http.createServer(server).listen(PORT);

console.log('start server on port', PORT);


http.ServerResponse.prototype.json = function (object){
	this.setHeader('Content-Type', 'application/json');
	return this.end(JSON.stringify(object));
};

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

	// console.log('request:', query);

	if (query.action in router) {
		try {
			response.statusCode = 200;
			router[query.action](request, response);
		}
		catch (err) {
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
