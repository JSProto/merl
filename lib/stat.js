
const cheerio = require('cheerio');
const Request = require('./request');

let host = new Buffer('aHR0cHM6Ly9tZXJsaW0ubmV0d29yaw==', 'base64').toString();

let path = host + '/sources/members/pages/';
let page = {
    login: host + '/sources/members/',
    profile: path + 'mi_cuenta_detalle.php?lang=en',
    products: path + 'carrito.php',
    logout: path + 'log_out.php'
};


let router = {
    _checkAccess: function(html){

        if (html.includes('Invalid username or password')){
            throw new Error('Invalid username or password');
        }

        if (html.includes('Acceso incorrecto')){
            throw new Error('Access denied');
        }
    },

    grab: function(url, data){
        if (url in router) {
            return router[url](data);
        }
        else {
            throw new Error(`grabber for ${url} is not defined`);
        }
    },

    [page.profile]: function (html) {
        this._checkAccess(html);

        let $ = cheerio.load(html);
        let data = {};

        let info = $('.box-info').last().find('dt').map(function(i, el) {
            let dt = $(el);
            let name = dt.text().trim().toLowerCase();
            let value = dt.next().text().trim();

            data[name] = value;

            return [name, value].join(':');
        }).get();

        let time = $('.bg-aqua').eq(9).find('h3').text();

        data['cgt'] = time.replace(/[\s]+/g, '');

        return data;
    }
};


module.exports = function (user){

    return new Promise(function(resolve, reject){

        let {name: txtusername, pass: txtpassword} = user;
        let request = new Request;

        request.get(page.login).then(function(res){

            request.post(page.profile, {txtusername, txtpassword}).then(res => {
                let json = router.grab(page.profile, res.body);
                resolve(json);
            }).catch(reject);

        }).catch(reject);
    });
};

