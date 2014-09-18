$(function () {
    'use strict';

    var $appView = $('#app-view');

    var Item = Backbone.Model.extend({

        defaults: function() {
            return {
                text: 'empty item',
                order: items.nextOrder(),
                priority: false,
                notes: '',
                reminderOffset: -1,
                reminderId: null,
                date: this.getDate(),
                time: this.getTime(),
                done: false
            };
        },

        validate: function(attribs) {
            if (!_.isString(attribs.text)) {
                return 'Text attribute must be a string';
            }
            if (!_.isBoolean(attribs.done)) {
                return 'Done attribute must be a boolean';
            }
            if (!_.isNumber(attribs.order)) {
                return 'Order attribute must be a number';
            }
            if (!_.isBoolean(attribs.priority)) {
                return 'Priority attribute must be a boolean';
            }
            if (!_.isString(attribs.notes)) {
                return 'Notes attribute must be a string';
            }
            if (!_.isString(attribs.date)) {
                return 'Date attribute must be a string';
            }
            if (!_.isString(attribs.time)) {
                return 'Time attribute must be a string';
            }
            if (!_.isNumber(attribs.reminderOffset)) {
                return 'Reminder offset attribute must be a number';
            }
        },

        initialize: function() {
            this.bind('invalid', function (model, error) {
                console.error(error);
            });
        },

        toggleDone: function() {
            this.save({done: !this.get('done')});
        },

        togglePriority: function(val) {
            this.save({priority: !this.get('priority')});
        },

        getDate: function() {
            var d = new Date();
            var yyyy = d.getFullYear();
            var mm = ((d.getMonth() + 1) < 10 ? '0' : '') + (d.getMonth() +1);
            var dd = (d.getDate() < 10 ? '0' : '') + d.getDate();
            return yyyy + '-' + mm + '-' + dd;
        },

        getTime: function() {
            var d = new Date();
            var h = (d.getHours() < 10 ? '0' : '') + d.getHours();
            var m = (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
            return h + ':' + m;
        },

        clear: function() {
            this.destroy();
        }
    });

    var ItemList = Backbone.Collection.extend({

        model: Item,

        localStorage: new Store('items'),

        done: function() {
            return this.where({done: true});
        },

        remaining: function() {
            return this.where({done: false});
        },

        nextOrder: function() {
            if (!this.length) {
                return 1;
            }
            return this.last().get('order') + 1;
        },

        // items are sorted by priority first and original insertion order second
        comparator: function(item) {
            return [item.get('priority') ? 0 : 1, item.get('order')];
        }
    });

    var AppRouter = Backbone.Router.extend({

        routes: {
            '':             'defaultRoute',
            'edit-list':    'editList',
            'edit/:id':     'edit'
        },

        initialize: function(options) {
            this.collection = options.collection;
            this.appView = options.appView;
        },

        editList: function() {
            var editListView = new EditListView({collection: this.collection});
            this.appView.showView(editListView);
            this.collection.fetch();
            editListView.trigger('rendered');
        },

        edit: function(id) {
            var item, editView;
            this.collection.fetch();
            item = this.collection.get(id);
            if (item !== undefined) {
                editView = new EditView({model: item});
                this.appView.showView(editView);
                editView.trigger('rendered');
            } else {
                router.navigate('', {trigger: true});
            }
        },

        defaultRoute: function() {
            var listView = new ListView({collection: this.collection});
            this.appView.showView(listView);
            this.collection.fetch({reset:true});
        }

    });

    var ViewManager = Backbone.View.extend({
        showView: function (view) {
            if (this.currentView) {
                this.currentView.destroy();
            }
            this.currentView = view;
            this.currentView.render();
            $appView.html(this.currentView.el);
        }
    });

    var ItemView = Backbone.View.extend({

        tagName:  'li',

        template: _.template($('#item-template').html()),

        events: {
            'click .check'      : 'toggleDone',
            'click .item-text'  : 'toggleDone',
            'click .edit'       : 'editItem',
            'keypress .edit'    : 'editOnEnter'
        },

        initialize: function() {
            this.listenTo(this.model, 'change', this.render);
            this.listenTo(this.model, 'destroy', this.remove);
        },

        render: function() {
            $(this.el).html(this.template(this.model.toJSON()));
            this.setText();
            return this;
        },

        setText: function() {
            var text = this.model.escape('text');
            this.$('.item-text').html(text);
        },

        toggleDone: function(e) {
            e.preventDefault();
            this.model.toggleDone();
        },

        editItem: function(e) {
            e.preventDefault();
            router.navigate('edit/' + this.model.get('id'), {trigger: true});
        },

        editOnEnter: function(e) {
            if (e.keyCode !== 13) {
                return;
            }
            router.navigate('edit/' + this.model.get('id'), {trigger: true});
        },

        remove: function() {
            $(this.el).remove();
        },

        clear: function() {
            this.model.clear();
        }

    });

    var EditListView = Backbone.View.extend({

        tagName:  'section',

        settingsTemplate: _.template($('#edit-list-template').html()),

        events: {
            'click #delete-completed':      'deleteCompleted',
            'click #delete-all':            'deleteAll',
            'click #uncheck-all':           'uncheckAll',
            'click #close-edit-list':       'closeEditList',
            'keypress #close-edit-list':    'closeOnEnter'
        },

        initialize: function(options) {
            this.bind('rendered', this.afterRender, this);
            this.collection = options.collection;
            this.deleteCompletedFlag = false;
            this.uncheckAllFlag = false;
            this.deleteAllFlag = false;
        },

        render: function() {
            $(this.el).html(this.settingsTemplate());
            return this;
        },

        afterRender: function() {
            this.updateEmailLink();
        },

        resetFlags: function() {
            this.deleteCompletedFlag = false;
            this.uncheckAllFlag = false;
            this.deleteAllFlag = false;
        },

        deleteCompleted: function() {
            this.resetFlags();
            this.deleteCompletedFlag = true;
        },

        deleteAll: function() {
            this.resetFlags();
            this.deleteAllFlag = true;
        },

        uncheckAll: function() {
            this.resetFlags();
            this.uncheckAllFlag = true;
        },

        updateEmailLink: function() {
            var mail = 'mailto:?', subject = 'My list', list = '';
            _.each(this.collection.models, function (model) {
                list += model.get('text') + '\n';
            });
            mail += 'subject=' + encodeURIComponent(subject);
            mail += '&body=' + encodeURIComponent(list);
            mail += encodeURIComponent('\n\nCreate your own checklist at: http://alxgbsn.co.uk/checklist/\n');
            $('#maillink').attr('href', mail);
            return false;
        },

        updateCollection: function() {
            var that = this;
            if (this.deleteCompletedFlag) {
                _.each(this.collection.done(), function (model) {
                    _reminders.remove(model.get('reminderId'));
                    model.clear();
                });
            }
            if (this.uncheckAllFlag) {
                _.each(this.collection.done(), function (model) {
                    model.save({'done': false});
                });
            }
            if (this.deleteAllFlag) {
                _reminders.removeAll();
                while (this.collection.models.length > 0) {
                    this.collection.models[0].destroy();
                }
            }
            router.navigate('', {trigger: true});
        },

        closeEditList: function(e) {
            e.preventDefault();
            this.updateCollection();
        },

        closeOnEnter: function(e) {
            if (e.keyCode !== 13) {
                return;
            }
            e.preventDefault();
            this.updateCollection();
        },

        destroy: function() {
            this.unbind();
            this.remove();
        }
    });

    var EditView = Backbone.View.extend({

        tagName:  'section',

        editTemplate: _.template($('#edit-template').html()),

        events: {
            'click #save-edit'      : 'saveItem',
            'click #delete'         : 'deleteItem',
            'keypress #edit-field'  : 'saveOnEnter',
            'keypress #save-edit'   : 'saveOnEnter',
            'click #edit-completed' : 'toggleDone',
            'click #priority'       : 'togglePriority'
        },

        initialize: function(options) {
            this.model = options.model;
            this.bind('rendered', this.afterRender, this);
            this.delete = false;
        },

        render: function() {
            $(this.el).html(this.editTemplate(this.model.toJSON()));
            this.setTitle();
            return this;
        },

        afterRender: function() {
            if (navigator.mozAlarms && 'Notification' in window) {
                $('#reminder').show();
            }
        },

        setTitle: function() {
            var text = this.model.escape('text');
            this.$('h1').html(text);
        },

        saveItem: function(e) {
            e.preventDefault();

            var item = $('#edit-field').val();
            var reminderOffset = parseInt($('#reminder-offset').val(), 10);
            var reminderId = this.model.get('reminderId');

            if (item !== '') {
                this.updateReminder(reminderId, reminderOffset);
            }
        },

        saveOnEnter: function(e) {
            var text = $('#edit-field').val();
            if (!text || e.keyCode !== 13) {
                return;
            }
            this.saveItem(e);
        },

        toggleDone: function() {
            this.model.toggleDone();
        },

        togglePriority: function(e) {
            this.model.togglePriority();
        },

        deleteItem: function(e) {
            e.preventDefault();

            if (confirm('Delete item ' + this.model.get('text') + '?')) {
                _reminders.remove(this.model.get('reminderId'));
                this.model.destroy();
                router.navigate('', {trigger: true});
            }
        },

        updateReminder: function(id, offset) {

            // clear any previous reminder before updating
            _reminders.remove(id);

            if (offset >= 0) {
                //console.log('setting reminder');
                this.setReminder(offset);
            } else {
                //console.log('closing view without setting reminder');
                this.saveCloseView();
            }
        },

        setReminder: function(offset) {
            var d = $('#reminder-date').val();
            var t = $('#reminder-time').val();
            var date = new Date(d + 'T' + t + ':00');

            date.setMinutes(date.getMinutes() - offset);

            var alarmData = {
                text: this.model.get('text')
            };

            if (date <= new Date()) {
                console.log('reminder already in the past, not setting');
                this.saveCloseView(null, -1);
                return;
            }

            _reminders.add(date, alarmData, offset, this.saveCloseView, this);
        },

        saveCloseView: function(id, offset) {

            var item = $('#edit-field').val();
            var notes = $('#notes').val();
            var date = $('#reminder-date').val();
            var time = $('#reminder-time').val();
            var reminderId = id || null;
            var reminderOffset = offset >= 0 ? offset : -1;

            this.model.save({
                text: item,
                notes: notes,
                date: date,
                time: time,
                reminderId: reminderId,
                reminderOffset: reminderOffset
            });

            router.navigate('', {trigger: true});
        },

        destroy: function() {
            this.unbind();
            this.remove();
        }

    });

    var ListView = Backbone.View.extend({

        tagName:  'section',

        statsTemplate: _.template($('#totals-template').html()),
        emptyListTemplate: _.template($('#empty-list-template').html()),
        listTemplate: _.template($('#list-template').html()),
        toolbarTemplate: _.template($('#toolbar-template').html()),

        events: {
            'keypress #new-item-name'   : 'createOnEnter',
            'click .edit-list'          : 'openSettings',
            'keypress .edit-list'       : 'settingsOnEnter'
        },

        initialize: function(options) {
            this.collection = options.collection;
            this.listenTo(this.collection, 'add', this.addOne);
            this.listenTo(this.collection, 'reset', this.addAll);
            this.listenTo(this.collection, 'all', this.render);
        },

        render: function() {
            var length = this.collection.length;
            this.$('#todo-stats').html(this.statsTemplate({
                total:      length,
                done:       this.collection.done().length,
                remaining:  this.collection.remaining().length
            }));
            this.$('#get-started').html(this.emptyListTemplate({
                total:      length
            }));
            this.$('#toolbar').html(this.toolbarTemplate({
                total:      length
            }));
            return this;
        },

        addOne: function(item) {
            var itemView = new ItemView({model: item});
            $('#todo-list').append(itemView.render().el);
        },

        addAll: function() {
            $(this.el).html(this.listTemplate());
            this.collection.each(this.addOne);
        },

        createOnEnter: function(e) {
            var input = $('#new-item-name'),
                text = input.val();
            if (!text || e.keyCode !== 13) { return; }
            e.preventDefault();
            this.collection.create({text: text});
            input.val('').blur();
        },

        openSettings: function() {
            router.navigate('edit-list', {trigger: true});
        },

        settingsOnEnter: function(e) {
            if (e.keyCode !== 13) { return; }
            router.navigate('edit-list', {trigger: true});
        },

        destroy: function() {
            this.remove();
        }

    });

    var _reminders = {

        bind: function() {
            var img = window.location.origin + '/checklist/images/fx-app-icon-128.png';
            if (navigator.mozAlarms && navigator.mozSetMessageHandler && 'Notification' in window) {
                navigator.mozSetMessageHandler('alarm', function(message) {

                    // launch notification
                    var notification = new Notification('Checklist', {
                        body: message.data.text,
                        icon: img
                    });

                    // vibrate for 500ms
                    if (navigator.vibrate) {
                        navigator.vibrate(500);
                    }
                });
            }
        },

        add: function(date, data, offset, callback, context) {
            var request;

            if (navigator.mozAlarms) {
                request = navigator.mozAlarms.add(date, 'ignoreTimezone', data);

                request.onsuccess = function () {
                    var alarms = navigator.mozAlarms.getAll();

                    alarms.onsuccess = function () {
                        if (this.result.length) {
                            var id = this.result[(this.result.length)-1].id;
                            // console.log('saving reminder: ' + id);
                            // console.log('saving offset: ' + offset);
                            if (typeof callback === 'function') {
                                callback.call(context, id, offset);
                            }
                        }
                    };

                    alarms.onerror = function (error) {
                        // console.log(error);
                        if (typeof callback === 'function') {
                            callback.call(context, null, -1);
                        }
                    }
                };
            }
        },

        remove: function(id) {
            if (navigator.mozAlarms && id) {
                // console.log('removing reminder: ' + id);
                navigator.mozAlarms.remove(id);
            }
        },

        removeAll: function() {
            var alarms;

            if (navigator.mozAlarms) {
                alarms = navigator.mozAlarms.getAll();

                alarms.onsuccess = function() {
                    if (this.result.length) {
                        this.result.forEach(function (reminder) {
                            // console.log('removing reminder: ' + reminder.id);
                            navigator.mozAlarms.remove(reminder.id);
                        });
                    }
                };

                alarms.onerror = function(error) {
                    console.log(error);
                };
            }
        }
    };

    var items = new ItemList();
    var appView = new ViewManager();
    var router = new AppRouter({collection: items, appView: appView});

    // hack to enable active pseudo styles in iOS Safari
    document.addEventListener('touchstart', function() {}, false);

    Backbone.history.start();
    _reminders.bind();
});
