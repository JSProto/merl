
const needle = require('needle');

class Request {

    constructor(){
        this.httpOptions = {
            compressed: true,
            follow: 5,
            follow_set_cookies: true,
            follow_set_referer: true,
            headers: {
                // 'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                // 'accept-encoding': 'gzip, deflate, sdch, br',
                'accept-language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4,uk;q=0.2',
                'cache-control': 'no-cache',
                'pragma': 'no-cache',
                'upgrade-insecure-requests': '1',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
            }
        };
    }

    get(url) {
        // console.log(`get ${url}`);
        return new Promise((resolve, reject) => {
            needle.get(url, this.httpOptions, (err, res) => {
                if (err) reject(err);

                this.httpOptions.cookies = res.cookies;
                this.httpOptions.headers.referer = url;

                resolve(res);
            })
        });
    }

    post(url, params){
        // console.log(`post ${url}`);
        return new Promise((resolve, reject) => {
            needle.post(url, params, this.httpOptions, (err, res) => {
                if (err) reject(err);
                this.httpOptions.cookies = res.cookies;
                resolve(res);
            })
        });
    }
}

module.exports = Request;