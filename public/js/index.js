
const notify = notification;

"default,info,error,success,warning".split(",").map(method => {
    notify[method] = function(message, options) {
        return notify.notify(method, message, options);
    };
});

notify.configProfile('global', {
    notification: {
        position: ['left', 'bottom']
    }
});

let request = function(url, data){
    let promise = null;

    return new Promise(function(resolve, reject){

        if (data) {
            promise = $.post(url, data, null, 'json');
        }
        else {
            promise = $.getJSON(url);
        }

        promise.then(resolve).catch(e => {
            notify.error(e.responseText);
            reject(e);
        });
    });
};


Vue.config.devtools = true
Vue.config.silent = false


Vue.filter('recordLength', function (result, key) {
    result = result || [];

    if (key) {
        Vue.set(this, key, result.length);
        // this.$set(key, result.length);
    }
    // console.log('recordLength', result);
    return result.length;
});


Vue.filter('formatGameTime', function (date, fromFormat) {
    let hours = Math.floor(moment.duration(date).as('hours'));
    let ms = moment(date, "hh:mm:ss").format("mm:ss");
    return `${hours}:${ms}`;
});
Vue.filter('formatLastStateChange', function (date, format) {
    date = Number(date);
    let hours = Math.floor(moment.duration(Date.now() - date).as('hours'));
    let ms = moment(date).format("mm:ss");
    return `${hours}:${ms}`;
});

Vue.filter('dump', function (dump, format) {
    console.log('dump', dump, format);
    return 1;
});

Vue.filter('runningOnHost', function (obj) {
    obj = obj || {};
    let l = data.vm.data.filter(r => r.state == 'Running').filter(r => r.host == obj.host).length;
    console.log('runningOnHost', l, obj);
    return l;
});

const DefaultGridCell = Vue.component('defaultGridCell', {
    props: ['row', 'column'],
    template: `<span>{{ $parent.formatData(column, row[column.key]) }}</span>`,
});

Vue.component('editableGridCell', DefaultGridCell.extend({
    template: `<input type="text" v-model="row[column.key]" lazy/>`
}));

// Vue.component('loginGridCell', DefaultGridCell.extend({
//     template: `<div style="font-size: 90%; font-weight: normal; display:block"
//         v-bind:class="'label label-' + row.pass ? 'success' : 'warning'"><span>{{ formatData(column, row[column.key]) }}</span></div>`
// }));
// Vue.component('linkedGridCell', DefaultGridCell.extend({
//     template: `<a href="http://www.google.com?q={{ row.name }}"><partial name="defaultGridCell"></partial></a>`
// }));
// Vue.component('buttonGridCell', DefaultGridCell.extend({
//     template: `<button class="btn btn-default btn-xs" @click="editItem(row.id)"> <partial name="defaultGridCell"></partial></button>`
// }));

Vue.component('timerGridCell', DefaultGridCell.extend({
    template: `
        <div class="progress right" style='margin-bottom:0'>
          <div class="progress-bar" role="progressbar" style="min-width: 4em;" :style="{width: row.transitiongoal + '%'}"
          :class="[!row.transitiongoal ? 'progress-bar-danger' : (row.transitiongoal < 100 ? 'progress-bar-warning' : 'progress-bar-success')]">
            <span>{{ $parent.formatData(column, row[column.key]) }}</span>
          </div>
        </div>
        `
}));

Vue.component('radioGridCell', DefaultGridCell.extend({
    template: `
    <button v-if="row.state === 'Disconnected' || row.state === 'Pending' || !row.state" type="button" class="btn btn-xs" autocomplete="off" disabled v-bind:class="row.state == 'Disconnected' ? '' : 'btn-info'">
        <span class="glyphicon" v-bind:class="row.state == 'Disconnected' ? 'glyphicon-flash' : 'glyphicon-time'"></span>
    </button>

    <button v-else-if="row.state === 'Running'" type="button" class="btn btn-xs btn-danger" autocomplete="off">
        <span class="glyphicon glyphicon-stop" @click.prevent="stop"></span>
    </button>

    <button v-else type="button" class="btn btn-xs" autocomplete="off"
        v-bind:class="row.state == 'PoweredOff' ? 'btn-primary' : (row.state == 'Paused' ? 'btn-info' : 'btn-warning')">
        <span class="glyphicon glyphicon-play" @click.prevent="start"></span>
    </button>
    `,

    methods: {
        'stop': function() {
            App.vmStop(this.row);
        },
        'start': function(){
            App.vmStart(this.row);
        }
    },
}));


const DataGrid = Vue.component('datagrid');


Vue.component('datagridvm', DataGrid.extend({
    methods: {
        refreshMerl: function(){
            App.refreshMerl(this);
        },
        refreshData: function(){
            App.refreshData(this);
        }
    }
}));

// data | filterBy row.host in 'host' | filterBy 'Running' in 'state' | recordLength

let store = {
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
            key: 'today_time',
            name: 'Today Time',
            template: 'timerGridCell',
            style: {
                width: '180px',
                'text-align': 'right'
            },
            filter: {
                name: "formatGameTime"
            }
        }, {
            key: 'today_downloads',
            name: 'Today DL',
            sortable: false,
            style: {
                width: '80px',
                'text-align': 'center'
            }
        }, {
            key: 'total_downloads',
            name: 'Total DL',
            sortable: false,
            style: {
                width: '80px',
                'text-align': 'center'
            }
        }, {
            key: 'host',
            name: 'Host',
            groupable: true,
            style: {
                width: '130px',
                'text-align': 'center'
            }
        }, {
            key: 'lastStateChange',
            name: 'Change',
            style: {
                width: '110px',
                'text-align': 'right'
            },
            filter: {
                name: "formatLastStateChange"
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
            key: 'action',
            name: ' ',
            sortable: false,
            template: 'radioGridCell',
            style: {
                width: '50px',
                'text-align': 'center'
            }
        }]
    },
    states: [
        'Null',
        'PoweredOff',
        'Saved',
        'Teleported',
        'Aborted',
        'Running',
        'Paused',
        'Stuck',
        'Teleporting',
        'LiveSnapshotting',
        'Starting',
        'Stopping',
        'Saving',
        'Restoring',
        'TeleportingPausedVM',
        'TeleportingIn',
        'FaultTolerantSyncing',
        'DeletingSnapshotOnline',
        'DeletingSnapshotPaused',
        'OnlineSnapshotting',
        'RestoringSnapshot',
        'DeletingSnapshot',
        'SettingUp',
        'Snapshotting',
    ]
};

let App = new Vue({
    el: '#content',
    data: function() {
        return store;
    },

    created: function() {
        this.fetchData().then(() => {
            $('.progress .progress-bar').progressbar();
        });
    },
    methods: {
        vmStart: function(vm){
            if (vm.state == 'Running') {
                notify.warning('virtual machine already Running');
                return false;
            }

            notify.info('start virtual machine ' + vm.name);
            vm.state = 'Pending';

            request(`/vm/start/${vm.id}`).then((res) => {
                if (res.success) {
                    vm.state = 'Running';
                    // GameTimeEmulator.get(vm).start();
                }
                else {
                    notify.error(res.message);
                    vm.state = 'PoweredOff';
                }
            });
        },
        vmStop: function(vm){
            if (vm.state == 'PoweredOff') {
                notify.warning('virtual machine already PoweredOff');
                return false;
            }

            notify.info('stop virtual machine ' + vm.name);
            vm.state = 'Pending';

            request(`/vm/stop/${vm.id}`).then((res) => {
                if (res.success) {
                    let time = moment(res.down_time).format("mm:ss");
                    vm.state = 'PoweredOff';
                    vm.down_time = res.down_time;
                    // GameTimeEmulator.get(vm).stop();
                }
                else {
                    notify.error(res.message);
                    vm.state = 'Running';
                }
            });
        },
        calculateTransitiongoal: function(row){
            let minutes = moment.duration(row.today_time).asMinutes();
            row.transitiongoal = (minutes > 40 ? 100 : minutes / 100 * 40);
        },
        processRow: function(row){
            this.calculateTransitiongoal(row);
            // if (row.state == 'Running') GameTimeEmulator.get(row).reset().start();
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


            let names = component.selectedRows.map(v => v.name);
            let data = names.length ? {ids: names} : null;

            let promise = request('/merl/list/', data);
            let refreshed = () => component.refreshingMerl = false;

            promise.then(() => this.refreshData(component))
                .then(refreshed)
                .catch(e => {
                    refreshed();
                    notify.error('Ошибка обновления Merl');
                    notify.error(e.message);
                });

            return promise;
        },

    },
    computed: {
        groupedHost: function(host, row){
            let r = this.$options.filters.groupBy(this.vm.data, 'host');
            console.dir(r);
            return r;
        }
    }
});

Vue.component('datagrid2', {
    template: '#datagrid2-template',
    props: {
        id: {
            type: String,
            required: true
        }
    },
    data: function () {
        return {
            sortingKey: null,
            sortingDirection: 1,
            groupingColumn: null,
            dataFilter: '',
            selectedRows: [],
            selectAll: false,
            refreshingData: false,
            refreshingMerl: false
        };
    },
});

function vmGetState (id) {
    let url = `/vm/state/${id}`;
    return request(`/vm/state/${id}`);
}
