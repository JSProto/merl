
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


function getVMlist(){
    return $.getJSON('/list').catch(e => notify.error(e.message));
}

function getVMState (vm) {
    let url = `/vm/${vm.name}/state`;
    return $.getJSON(url).catch(e => {
        notify.error(url + ': ' +  e.message);
    });
}


Vue.config.debug = false;


// Vue.partial('defaultGridCell', `<span>{{ formatData(column, row[column.key]) }}</span>`);

Vue.partial('loginGridCell', `<div style="font-size: 90%; font-weight: normal; display:block" class="label label-{{row.pass ? 'success' : 'warning'}}"><partial name="defaultGridCell"></partial></div>`);
Vue.partial('timerGridCell',`
<div class="progress" style='margin-bottom:0'>
  <div class="progress-bar" role="progressbar" aria-valuenow="20" aria-valuemin="10" aria-valuemax="100" style="min-width: 2em; width: 40%">
    <partial name="defaultGridCell"></partial>
  </div>
</div>
`);

Vue.partial('linkedGridCell', `<a href="http://www.google.com?q={{ row.name }}"><partial name="defaultGridCell"></partial></a>`);

Vue.partial('buttonGridCell', `<button class="btn btn-default btn-xs" @click="editItem(row.id)"> <partial name="defaultGridCell"></partial></button>`);

Vue.partial('radioGridCell', `
<button @click.prevent="$emit('vm-operation', row)" type="button" data-loading-text="Loading..." class="btn btn-xs btn-{{row.state == 'stopped' ? 'primary' : (row.state == 'process' ? 'danger' : 'info')}}" autocomplete="off">
    <span v-if="row.state === 'stopped'" class="glyphicon glyphicon-play"></span>
    <span v-if="row.state === 'process'" class="glyphicon glyphicon-stop"></span>
    <span v-if="row.state !== 'stopped' && row.state !== 'process'" class="glyphicon glyphicon-cloud-download"></span>
</button>
`);


// Vue.partial('radioGridCell', `
// <div class="btn-group" data-toggle="buttons">
//   <label v-if="row.state === 'stopped'" class="btn btn-xs btn-primary">
//     <input type="radio" name="option-{{row.name}}" id="option-{{row.name}}-1" autocomplete="off" @click.prevent="$emit('start-vm', row)"> <span class="glyphicon glyphicon-play"></span>
//   </label>
//   <label v-if="row.state === 'process'"  class="btn btn-xs btn-danger">
//     <input type="radio" name="option-{{row.name}}" id="option-{{row.name}}-3" autocomplete="off" @click.prevent="$emit('stop-vm', row)"> <span class="glyphicon glyphicon-stop"></span>
//   </label>
//   <label v-if="row.state !== 'stopped' && row.state !== 'process'" class="btn btn-xs btn-info">
//     <input type="radio" name="option-{{row.name}}" id="option-{{row.name}}-2" autocomplete="off" @click.prevent="$emit('refresh-vm', row)"> <span class="glyphicon glyphicon-cloud-download"></span>
//   </label>
// </div>
// `);


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
                key: 'action', // pending, process, stopped
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
        this.fetchData();
    },

    methods: {
        startVM: function(vm){
            if (vm.state == 'process') {
                notify.warning('virtual machine already running');
                return false;
            }

            notify.info('start virtual machine ' + vm.name);
            vm.state = 'pending';

            $.getJSON(`/vm/${vm.name}/start`).then((res) => {
                if (res.success) {
                    vm.state = 'process';
                }
                else {
                    notify.error(res.message);
                    vm.state = 'stopped';
                }
            }).catch(notify.error);
        },
        stopVM: function(vm){
            if (vm.state == 'stopped') {
                notify.warning('virtual machine already stopped');
                return false;
            }

            notify.info('stop virtual machine ' + vm.name);
            vm.state = 'pending';

            $.getJSON(`/vm/${vm.name}/stop`).then((res) => {
                if (res.success) {
                    vm.state = 'stopped';
                }
                else {
                    notify.error(res.message);
                    vm.state = 'process';
                }
            }).catch(notify.error);
        },
        vmOperation: function(vm){
            // stop
            if (vm.state == 'process') {
                this.stopVM(vm);
            }
            //start
            else if (vm.state == 'stopped') {
                this.startVM(vm);
            }
            // pending
            else {
                return false;
            }
        },
        fetchData: function() {
            notify.info('Загрузка данных...');

            getVMlist().then((data) => {
                notify.info('Данные загружены');
                this.vm.data = data;
            }).catch(e => {
                notify.error('Ошибка загрузки данных');
                notify.error('e.message');
            });
        }
    }
});

