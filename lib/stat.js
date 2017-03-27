
const Nightmare = require('nightmare');
const co = require('co');

const host = new Buffer('aHR0cHM6Ly9tZXJsaW0ubmV0d29yaw==', 'base64').toString();

module.exports = function (user){

    return co(function*() {
        let info = {};

        let nightmare = Nightmare({
            width: 1440,
            height: 900
        })
        .useragent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36")
        .viewport(1140, 900);

        yield nightmare
            .goto(host + '/sources/members/')
            .insert('form [name=txtusername]', user.name)
            .insert('form [name=txtpassword]', user.pass)
            .click('form button.login')
            .wait('i.fa-sign-out');

        // yield nightmare
        //  .evaluate(function() {
        //      let data = {}
        //         $('.box-info').last().find('dt').map(function(i, el) {
        //             let dt = $(el);
        //             let name = dt.text().toLowerCase().trim();
        //             let value = dt.next().text().trim();

        //             data[name] = value;
        //         });
        //      return data;
        //  })
        //  .then(function(data) {
        //      Object.assign(info, data);
        //  });

        yield nightmare
            .click('a#gConG')
            .wait('i.fa-sign-out')
            .evaluate(function() {
                let data = {};

                $('.box h4').map(function(i, h4) {
                    let $h4 = $(h4);
                    let ptitle = $h4.closest('.box').find('.box-title').html();
                    let stitle = $h4.html();
                    let value = $h4.parent().find('input,h2');
                    let title = [ptitle, stitle].join('_').toLowerCase();
                    value = (value.text() || value.val()).replace(/[^\d:]+/g, '').replace(/[\s]+/g, '');

                    data[title] = value;
                });

                return data;
            })
            .then(function(data) {
                Object.assign(info, data);
                // console.log(info)
            });

        yield nightmare
            .click('i.fa-sign-out')
            .wait('div.form-login')
            .end();

        return info;
    });
};

