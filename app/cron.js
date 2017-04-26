
const path = require('path');

const cron = require(path.resolve('lib', 'cron.js'));
const Rotator = require(path.resolve('lib', 'rotator.js'));

const application = global.application;


module.exports = function(){

    cron.schedule("1 0 7 * * *", function resetAllGameTimers(options){
        applecation.db.resetAllGameTimers();
    });

    Rotator.start(cron);
};

