
Vue.partial('defaultGridCell', `<span>{{ formatData(column, row[column.key]) }}</span>`);
Vue.partial('editableGridCell', `<input type="text" v-model="row[column.key]" lazy/>`);

Vue.filter('groupBy', function (value, key) {
    var groups = {
        data: value
    };

    if (key) {
        groups = {};
        for (var i = 0; i < value.length; i++) {
            var row = value[i];
            var cell = row[key];

            if (!groups.hasOwnProperty(cell)) {
                groups[cell] = [];
            }

            groups[cell].push(row);
        }
    }

    return groups;
});

Vue.component('dropdown', {
    template: '#dropdown-template',
    props: {
        for: {
            type: String,
            required: true
        },

        origin: {
            type: String,
            default: 'top left'
        },

        preserveState: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        originClass: function () {
            switch (this.origin) {
                case 'top left':
                    return 'dropdown-top-left';
                case 'bottom left':
                    return 'dropdown-bottom-left';
                case 'bottom right':
                default:
                    return 'dropdown-bottom-right';
            }
        }
    },
    data: function () {
        return {
            show: false
        };
    },
    ready: function () {
        var _this = this;

        var element = document.getElementById(_this.for);

        var hide = function (event) {
            event.stopPropagation();

            if (!(_this.preserveState && _this.$el.contains(event.target))) {
                _this.show = false;
                document.body.removeEventListener('click', hide);
            }
        };

        var show = function (event) {
            event.preventDefault();
            event.stopPropagation();

            var dropdowns = [].slice.call(document.querySelectorAll('.dropdown'));

            dropdowns.forEach(function (dropdown) {
                dropdown.__vue__.show = false;
            });

            if (!_this.show) {
                _this.show = true;

                document.body.addEventListener('click', hide);
            }
        };

        element.addEventListener('click', show);
    }
});

Vue.component('datagridOptions', {
    template: '#datagrid-options-template',
    props: {
        gridId: {
            type: String,
            required: true
        },
        columns: {
            type: Array,
            required: true
        },
        allowSelection: {
            type: Boolean
        },
        allowEdit: {
            type: Boolean
        },
        groupingColumn: {
            // type: Object,
            required: false
        },
        dataFilter: {
            type: String,
            default: '',
            required: true
        },
        showAdvancedOptions: {
            type: Boolean
        }
    },
    methods: {
        getControlName(columnKey, suffix) {
            return this.gridId + '-' + columnKey + '-' + suffix;
        }

    }
});

Vue.component('datagrid', {
    template: '#datagrid-template',
    props: {
        id: {
            type: String,
            required: true
        },
        columns: {
            type: Array,
            required: true
        },
        data: {
            type: Array
        },
        cellTemplate: {
            type: String,
            required: false,
            default: 'defaultGridCell'
        },
        allowSelection: {
            type: Boolean,
            required: false,
            default: true
        },
        allowEdit: {
            type: Boolean,
            required: false,
            default: false
        },
        showDefaultOptions: {
            type: Boolean,
            required: false,
            default: true
        },
        showAdvancedOptions: {
            type: Boolean,
            required: false,
            default: false
        }
    },
    computed: {
        columnSpan: function () {
            return this.allowSelection ? this.columns.length + 1 : this.columns.length;
        },
        showOptions: function () {
            return this.showDefaultOptions || this.showAdvancedOptions;
        },
        showFooter: function () {
            return this.dataFilter || this.groupingColumn || this.selectedRows.length > 0;
        }
    },
    data: function () {
        return {
            sortingKey: null,
            sortingDirection: 1,
            groupingColumn: null,
            dataFilter: '',
            selectedRows: [],
            selectAll: false
        };
    },
    methods: {
        getCellTemplate: function (column) {
            return column.editable === true && this.allowEdit ? 'editableGridCell' : (column.template || this.cellTemplate);
        },
        getColumnStyle: function (column) {
            return column.style || {};
        },
        getControlId: function (groupName, index, suffix) {
            return groupName + '-' + index + (suffix ? '-' + suffix : '');
        },
        sortBy: function (column) {
            if (column.sortable === false) return;
            if (column.key === this.sortingKey) {
                this.sortingDirection *= -1;
                return;
            }

            this.sortingKey = column.key;
            this.sortingDirection = 1;
        },
        groupBy: function (column) {
            this.groupingColumn = column || null;
        },
        resetFilter: function () {
            this.dataFilter = '';
        },
        resetGrouping: function () {
            this.groupingColumn = null;
        },
        resetSelection: function () {
            this.selectedRows = [];
            this.selectAll = false;
        },
        formatData: function (column, value) {
            if (column.hasOwnProperty('filter')) {
                var filter = Vue.filter(column.filter.name);
                if (!filter) throw new Error(`filter "${column.filter.name}" not found`);
                var args = [].concat(value, column.filter.args);
                return (filter.read || filter).apply(this, args);
            }
            return value;
        },
        addRow: function () {
            var nextId = this.data.reduce((m, e)=> m > e.id ? m:  parseInt(e.id), 0) + 1;
            this.data.unshift({
                id: nextId,
                description: 'test'
            });
            this.allowEdit = true;
            this.allowSelection = true;
        },
        removeRows: function () {
            this.selectedRows.forEach(row => this.data.$remove(row));
            this.resetSelection();
        }
    },
    watch: {
        selectAll: function (value) {
            this.selectedRows = value ? [].concat(this.data) : [];
        }
    }
});


