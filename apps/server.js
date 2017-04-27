"use strict";

const path = require('path');
const express = require('express');
const yields = require('express-yields');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');

const app = express();


module.exports = function (application) {
    const config = application.config;


    app.set('application', application);
    app.set('db', application.db);
    app.set('cluster', application.cluster);

    app.use('/jsparty', express.Router().use(express.static(path.resolve('bower_components'))));
    app.use(express.static(path.resolve('public')));

    app.use(methodOverride('_method'));
    app.use(bodyParser.urlencoded({
        extended: true
    }));

    app.use(logErrors);
    app.use(clientErrorHandler);
    app.use(errorHandler);

    app.engine('html', require('ejs').renderFile);
    app.set('views', path.resolve('views'));
    app.set('view engine', 'html');
    app.disable('view cache');

    require(path.resolve('routers'))(app);

    let httpServer = app.listen(config.port || 3000, function() {
        let {family, address, port} = httpServer.address();
        application.httpServer = httpServer;

        console.log(`Listening on http://${family == "IPv6" ? `[${address}]` : address}:${port}`);
    });

    httpServer.on('close', function(){
        console.log();
        console.log("Shutting down the http server...");
    });

    return httpServer;
};



/////// ERROR HANDLERS

function logErrors(err, req, res, next) {
    let application = app.get('application');
    // yield application.close();
    console.error(err.stack);
    next(err);
}

function clientErrorHandler(err, req, res, next) {
    res.status(500);

    if (req.xhr) {
        if (req.accepts('html', 'json') == 'json') {
            res.json({
                message: err.message,
                stack: err.stack,
                success: false
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
    let { message, stack } = error;
    res.render('error', {
        message,
        stack
    });
}
