
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


function vmStart(name){
    return request(`/vm/${name}/start`);
}

function vmStop(name){
    return request(`/vm/${name}/stop`);
}

function vmGetState (name) {
    let url = `/vm/${name}/state`;
    return request(`/vm/${name}/state`);
}

function vmRefresh(){
    return request('/refresh');
}

function vmGetList(){
    return request('/list');
}



Vue.config.debug = false;

Vue.filter('recordLength', function (result, key) {
    if (key) {
        this.$set(key, result.length);
    }
    return result.length;
})

// Vue.partial('defaultGridCell', `<span>{{ formatData(column, row[column.key]) }}</span>`);
// <span>{{ processed }}</span>

Vue.partial('loginGridCell', `<div style="font-size: 90%; font-weight: normal; display:block" class="label label-{{row.pass ? 'success' : 'warning'}}"><partial name="defaultGridCell"></partial></div>`);
Vue.partial('timerGridCell',`
<div class="progress right" style='margin-bottom:0'>
  <div class="progress-bar progress-bar-warning" role="progressbar" style="min-width: 4em;" :style="{width: row.transitiongoal + '%'}">
    <partial name="defaultGridCell"></partial>
  </div>
</div>
`);

Vue.partial('linkedGridCell', `<a href="http://www.google.com?q={{ row.name }}"><partial name="defaultGridCell"></partial></a>`);

Vue.partial('buttonGridCell', `<button class="btn btn-default btn-xs" @click="editItem(row.id)"> <partial name="defaultGridCell"></partial></button>`);

Vue.partial('radioGridCell', `
<button @click.prevent="$dispatch('vm-operation', row)" type="button" class="btn btn-xs" autocomplete="off"
    v-bind:class="[row.state == 'poweroff' ? 'btn-primary' : (row.state == 'running' ? 'btn-danger' : 'btn-info')]"
    :disabled="row.state === 'unknown' || row.state === 'poweroff' && processed > 2">
    <span v-if="row.state === 'poweroff'" class="glyphicon glyphicon-play"></span>
    <span v-if="row.state === 'running'" class="glyphicon glyphicon-stop"></span>
    <span v-if="row.state !== 'poweroff' && row.state !== 'running'" class="glyphicon glyphicon-cloud-download"></span>
</button>
`);


let App = new Vue({
    el: '#content',
    replace: false,
    data: {
        vm: {
            data: [],

            columns: [{
                key: 'name',
                name: 'Login',
                // template: 'loginGridCell',
                style: {
                    'text-align': 'left'
                }
            }, {
                key: 'game_time',
                name: 'Game Time',
                template: 'timerGridCell',
                style: {
                    width: '150px',
                    'text-align': 'right'
                }
            }, {
                key: 'down_time',
                name: 'Down Time',
                style: {
                    width: '200px',
                    'text-align': 'center'
                },
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
                    'text-align': 'right'
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
        'refresh-table': 'refreshTable',
        'vm-operation': 'vmOperation'
    },
    methods: {
        startVM: function(vm){
            if (vm.state == 'running') {
                notify.warning('virtual machine already running');
                return false;
            }

            notify.info('start virtual machine ' + vm.name);
            vm.state = 'pending';
            vmStart(vm.name).then((res) => {
                if (res.success) {
                    vm.state = 'running';
                }
                else {
                    notify.error(res.message);
                    vm.state = 'poweroff';
                }
            });
        },
        stopVM: function(vm){
            if (vm.state == 'poweroff') {
                notify.warning('virtual machine already poweroff');
                return false;
            }

            notify.info('stop virtual machine ' + vm.name);
            vm.state = 'pending';

            vmStop(vm.name).then((res) => {
                if (res.success) {
                    vm.state = 'poweroff';
                }
                else {
                    notify.error(res.message);
                    vm.state = 'running';
                }
            });
        },
        vmOperation: function(vm){
            // stop
            if (vm.state == 'running') {
                this.stopVM(vm);
            }
            //start
            else if (vm.state == 'poweroff') {
                this.startVM(vm);
            }
            // pending
            else {
                return false;
            }
        },
        fetchData: function() {
            notify.info('Загрузка данных...');

            return vmGetList().then((response) => {
                notify.info('Данные загружены');
                this.vm.data = response.list;
                this.vm.data.forEach(this.calculateProgressBar);
                console.log('trueeee');
            }).catch(e => {
                notify.error('Ошибка загрузки данных');
                notify.error('e.message');
            });
        },
        calculateProgressBar: function(row){
            let gt = moment.duration(row.game_time);
            let time = gt.asMinutes();
            time = time > 40 ? 100 : time / 100 * 40;
            row.transitiongoal = time;
        },
        refreshTable: function(component) {
            component.refreshingData = true;

            vmRefresh().then(() => {
                this.fetchData().then(() => {
                    component.refreshingData = false;
                });
            });
        }
    }
});

