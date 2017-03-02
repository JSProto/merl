
const express = require('express');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');

let app = express();
let router = require('./lib/router');

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
app.disable('view cache');

router(app);

app.listen(3000, function () {
    console.log('server app listening on port 3000!')
});

/////// ERROR HANDLERS

function logErrors(err, req, res, next) {
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
    let {message, stack} = error;
    res.render('error', {message, stack});
}