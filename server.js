
const needle = require('needle');
const http = require('http');
// const url = require('url');
// const qs = require('querystring');

const express = require('express');
const methodOverride = require('method-override');
const bodyParser = require('body-parser');

let app = express();
let server = http.Server(app);

let package = require('./package.json');


let db = require('./lib/db');
let _  = db._;

db.load();
getAllVm().then(vms => db.refresh(vms));

app.use('/jsparty', express.Router().use(express.static(__dirname + '/bower_components')));
app.use(express.static(__dirname + '/public'));


app.use(methodOverride('_method'));
app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(logErrors);
app.use(clientErrorHandler);
app.use(errorHandler);

app.engine('html', require('ejs').renderFile);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');



// http://localhost:8181/?action=list

app.use('/vm', (function(){

    let router = express.Router();

    router.get('/:id/start', (req, res) => {
        db.load();
        let vm = _.getById(db.vms, req.params.id);

        needleGet(vm.host + '/?action=start&name=' + vm.name)
            .then(r => res.json(r))
            .catch(e => res.json(e))
    });

    router.get('/:id/stop', (req, res) => {
        db.load();
        let vm = _.getById(db.vms, req.params.id);

        needleGet(vm.host + '/?action=stop&name=' + vm.name)
            .then(r => res.json(r))
            .catch(e => res.json(e))
    });

    router.get('/:id/status', (req, res) => {
        db.load();
        let vm = _.getById(db.vms, req.params.id);

        needleGet(vm.host + '/?action=status&name=' + vm.name)
            .then(r => {
                r.status = r.status ? 'process' : 'stopped';
                res.json(r);
            })
            .catch(e => res.json(e))
    });

    return router;
})());

app.all('/', (req, res) => res.render('index'));

app.get('/list', (req, res) => {
    db.load();

    getAllVm().then(vms => {
        db.refresh(vms);
        res.json(db.vms);
    });
});


// app.all('/vm', (req, res) => res.render('list'));

// app.get('/status', function(req, res) {
//     if (currentJob) {
//         res.json([currentJob, currentJobStatus]);
//     }
//     else {
//         throw new Error('no current job running')
//     }
// });

// app.get('/stop', function(req, res) {
//     if (currentJob) {
//         res.json([currentJob.emit('kill'), currentJobStatus]);
//     }
//     else {
//         throw new Error('no current job running');
//     }
// });

server.listen(3000);
console.log('server started on port 3000');


///// APP HANDLERS

function logErrors(err, req, res, next) {
    console.error(err.stack);
    next(err);
}
function clientErrorHandler(err, req, res, next) {
    res.status(500);

    if (req.xhr) {
        if (req.accepts('html', 'json') == 'json') {
            res.json({
                error: err.message,
                stack: err.stack,
                ok: false
            });
        }
        else {
            res.send(err.message + '\n' + err.stack);
        }
    }
    else {
        next(err);
    }
}
function errorHandler(error, req, res, next) {
    let {message, stack} = error; // fix
    res.render('error', {error});
}


///// HELPERS

function getAllVm (){
    return new Promise((resolve, reject) => {
        let vms = [];

        db.hosts.reduce((resolver, host) => {
            return resolver.then(() => needleGet(host + '/?action=list'))
                .then(result => {
                    if (result.success) {
                        result.list.forEach(vm => (vm.host = host));
                        vms = vms.concat(result.list);
                    }
                })
                .catch(e => console.error(e.message));
        }, Promise.resolve()).then(() => resolve(vms));
    });
};

function needleGet(url) {
    return new Promise((resolve, reject) => {
        needle.get(url, (err, res, json) => err ? reject(err) : resolve(json));
    });
}