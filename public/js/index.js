
const notify = notification;

"default,info,error,success,warning".split(",").map(method => {
    notify[method] = function(message, options) {
        return notify.notify(method, message, options);
    };
});

notify.configProfile('global', {
    notification: {
        position: ['right', 'bottom']
    }
});

let request = function(url){
    return new Promise(function(resolve, reject){
        $.getJSON(url).then(resolve).catch(e => {
            notify.error(e.message);
            reject(e);
        });
    });
};


Vue.config.debug = false;

Vue.filter('recordLength', function (result, key) {
    if (key) {
        this.$set(key, result.length);
    }
    return result.length;
});

Vue.filter('formatDownTime', function (date, format) {
    return moment(date).format(format || 'MMMM Do, HH:mm:ss'); // March 3rd, 8:55:36 pm
});

Vue.filter('formatGameTime', function (date, fromFormat) {
    let hours = Math.floor(moment.duration(date).as('hours'));
    let ms = moment(date, "hh:mm:ss").format("mm:ss");
    return `${hours}:${ms}`;
});

// Vue.partial('defaultGridCell', `<span>{{ formatData(column, row[column.key]) }}</span>`);
// <span>{{ processed }}</span>

Vue.partial('loginGridCell', `<div style="font-size: 90%; font-weight: normal; display:block" class="label label-{{row.pass ? 'success' : 'warning'}}"><partial name="defaultGridCell"></partial></div>`);

Vue.partial('timerGridCell',`
<div class="progress right" style='margin-bottom:0'>
  <div class="progress-bar" role="progressbar" style="min-width: 4em;" :style="{width: row.transitiongoal + '%'}"
  :class="[!row.transitiongoal ? 'progress-bar-danger' : (row.transitiongoal < 100 ? 'progress-bar-warning' : 'progress-bar-success')]"
  >
    <partial name="defaultGridCell"></partial>
  </div>
</div>
`);

Vue.partial('linkedGridCell', `<a href="http://www.google.com?q={{ row.name }}"><partial name="defaultGridCell"></partial></a>`);

Vue.partial('buttonGridCell', `<button class="btn btn-default btn-xs" @click="editItem(row.id)"> <partial name="defaultGridCell"></partial></button>`);

Vue.partial('radioGridCell', `
    <button type="button" class="btn btn-xs" autocomplete="off"
        v-bind:class="[row.state == 'poweroff' ? 'btn-primary' : (row.state == 'running' ? 'btn-danger' : 'btn-info')]"
        :disabled="row.state === 'unknown' || row.state === 'poweroff' && processed > 2">
        <span v-if="row.state === 'poweroff'" class="glyphicon glyphicon-play" @click.prevent="$dispatch('vm-start', row)"></span>
        <span v-if="row.state === 'running'" class="glyphicon glyphicon-stop" @click.prevent="$dispatch('vm-stop', row)"></span>
        <span v-if="row.state !== 'poweroff' && row.state !== 'running'" class="glyphicon glyphicon-time"></span>
    </button>
`);


class GameTimeEmulator {
    constructor(row){
        this.row = row;
        this.seconds = 0;
        row._timer = this;
        this.reset();
    }

    reset(){
        this.stop();
        this.seconds = moment.duration(this.row.game_time).as('seconds');
        return this;
    }

    start() {
        this._timer = setInterval(() => {
            this.seconds++;

            let d = moment.duration(this.seconds, 's').as('ms');
            let hours = Math.floor(moment.duration(d).as('hours'));
            let ms = moment(d).format("mm:ss");

            this.row.game_time = `${hours}:${ms}`

        }, 1000);
        return this;
    }

    stop() {
        clearInterval(this._timer);
        return this;
    }

    static get (row){
        return row._timer ? row._timer : new GameTimeEmulator(row);
    }
}


let App = new Vue({
    el: '#content',
    replace: false,
    data: {
        vm: {
            data: [],

            columns: [{
                key: 'name',
                name: 'Name',
                // template: 'loginGridCell',
                style: {
                    'text-align': 'left'
                }
            }, {
                key: 'game_time',
                name: 'Game Time',
                template: 'timerGridCell',
                style: {
                    width: '180px',
                    'text-align': 'right'
                },
                filter: {
                    name: "formatGameTime"
                }
            }, {
                key: 'down_time',
                name: 'Down Time',
                style: {
                    width: '200px',
                    'text-align': 'center'
                },
                filter: {
                    name: "formatDownTime"
                }
            }, {
                key: 'host',
                name: 'Host',
                groupable: true,
                style: {
                    width: '150px',
                    'text-align': 'center'
                }
            }, {
                key: 'state',
                name: 'State',
                groupable: true,
                style: {
                    width: '120px',
                    'text-align': 'center'
                }
            }, {
                key: 'action', // pending, process, poweroff
                name: ' ',
                sortable: false,
                template: 'radioGridCell',
                style: {
                    width: '50px',
                    'text-align': 'center'
                }
            }]
        }
    },

    created: function() {
        $('.progress .progress-bar').progressbar();
        this.fetchData();

        // this.$on('refresh-table', function (id) {
        //   console.log('created refresh');
        // })
    },
    events: {
        'refresh-data': 'refreshData',
        'refresh-merl': 'refreshMerl',
        'vm-stop': 'vmStop',
        'vm-start': 'vmStart'
    },
    methods: {
        vmStart: function(vm){
            if (vm.state == 'running') {
                notify.warning('virtual machine already running');
                return false;
            }

            notify.info('start virtual machine ' + vm.name);
            vm.state = 'pending';

            request(`/vm/${vm.name}/start`).then((res) => {
                if (res.success) {
                    vm.state = 'running';
                    GameTimeEmulator.get(vm).start();
                }
                else {
                    notify.error(res.message);
                    vm.state = 'poweroff';
                }
            });
        },
        vmStop: function(vm){
            if (vm.state == 'poweroff') {
                notify.warning('virtual machine already poweroff');
                return false;
            }

            notify.info('stop virtual machine ' + vm.name);
            vm.state = 'pending';

            request(`/vm/${vm.name}/stop`).then((res) => {
                if (res.success) {
                    let time = moment(res.down_time).format("mm:ss");
                    vm.state = 'poweroff';
                    vm.down_time = res.down_time;
                    GameTimeEmulator.get(vm).stop();
                }
                else {
                    notify.error(res.message);
                    vm.state = 'running';
                }
            });
        },
        calculateTransitiongoal: function(row){
            let minutes = moment.duration(row.game_time).asMinutes();
            row.transitiongoal = (minutes > 40 ? 100 : minutes / 100 * 40);
        },
        processRow: function(row){
            this.calculateTransitiongoal(row);
            if (row.state == 'running') GameTimeEmulator.get(row).reset().start();
        },
        fetchData: function() {
            return request('/list').then((response) => {
                this.vm.data = response.list;
                this.vm.data.forEach(row => this.processRow(row));
                notify.info('Данные получены');
            }).catch(e => {
                notify.error('Ошибка получения');
                notify.error(e.message);
            });
        },
        refreshData: function(component) {
            component.refreshingData = true;

            let promise = request('/list');


            let refreshed = () => component.refreshingData = false;

            promise.then((response) => {
                response.list.forEach((rvm) => {
                    this.vm.data.find((vm, index) => {
                        if (vm.name === rvm.name) {
                            Object.assign(vm, rvm);
                            this.processRow(vm);
                        }
                    });
                });
                refreshed();
                notify.info('Данные обновлены');
            }).catch(e => {
                refreshed();
                notify.error('Ошибка обновления');
                notify.error(e.message);
            });

            return promise;
        },
        refreshMerl: function(component) {
            component.refreshingMerl = true;

            console.log(component.selectedRows.length);

            let promise = request('/merl/list/');
            let refreshed = () => component.refreshingMerl = false;

            promise.then(() => this.refreshData(component))
                .then(refreshed)
                .catch(e => {
                    refreshed();
                    notify.error('Ошибка обновления Merl');
                    notify.error(e.message);
                });

            return promise;
        }

    }
});


function vmGetState (name) {
    let url = `/vm/${name}/state`;
    return request(`/vm/${name}/state`);
}
