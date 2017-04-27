
const path = require('path');
const cron = require(path.resolve('lib', 'schedule.js'));

module.exports = function(applecation){
    cron.schedule("1 0 6 * * *", function resetAllGameTimers(options){
        applecation.db.resetAllGameTimers();
    });
};

