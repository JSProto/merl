
const cron = require('pomelo-schedule');


cron.cancel = cron.cancelJob;
cron.schedule = function (trigger, job, options){
    options = Object.assign({}, options);
    options.description = options.description || job.name || 'anonymous';
    return this.scheduleJob(trigger, function(opts) {
        let date = (new Date()).toISOString();
        console.log(`${date}: run job: ${opts.description}`);
        job(opts);
    }, options);
};

module.exports = cron;